import userRepository from '../db/repositories/userRepository.js';
import { getPrisma } from '../config/database.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';
import adminBroadcast from '../utils/adminBroadcast.js';

import smartCache from '../utils/smartCache.js';

/**
 * Get user profile with addresses
 */
export const getProfile = async (userId) => {
    return smartCache.getOrFetch(
        smartCache.keys.profile(userId),
        async () => {
            const prisma = getPrisma();
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    addresses: {
                        orderBy: [
                            { isDefault: 'desc' },
                            { createdAt: 'desc' }
                        ]
                    }
                }
            });

            if (user) {
                delete user.password; // Never expose password hash
            }

            return user;
        },
        { type: 'users', swr: true }
    );
};

/**
 * Update profile with validation
 * OPTIMIZED: Supports _changedFields directive, skips empty updates
 */
export const updateProfile = async (userId, data) => {
    // OPTIMIZATION: Extract _changedFields directive if present
    const frontendChangedFields = data._changedFields;
    delete data._changedFields;

    // OPTIMIZATION: Skip if frontend reports no changes
    if (frontendChangedFields && frontendChangedFields.length === 0) {
        logger.info(`[PERF] Profile update skipped - no changes for user ${userId}`);
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        delete user.password;
        return user;
    }

    // FIXED BUG #7: Input validation
    const updates = {};

    if (data.firstName !== undefined) {
        const firstName = data.firstName?.trim();
        if (!firstName || firstName.length < 1 || firstName.length > 100) {
            throw new Error('First name must be 1-100 characters');
        }
        updates.firstName = firstName;
    }

    if (data.lastName !== undefined) {
        const lastName = data.lastName?.trim();
        if (!lastName || lastName.length < 1 || lastName.length > 100) {
            throw new Error('Last name must be 1-100 characters');
        }
        updates.lastName = lastName;
    }

    if (data.phone !== undefined) {
        const phone = data.phone?.trim();
        if (phone && !/^[\d\s\-\+\(\)]{7,20}$/.test(phone)) {
            throw new Error('Phone number must be 7-20 characters and contain only digits, spaces, +, -, ()');
        }
        updates.phone = phone || null;
    }

    // OPTIMIZATION: Skip DB call if no actual updates
    if (Object.keys(updates).length === 0) {
        logger.info(`[PERF] Profile update skipped - empty updates for user ${userId}`);
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        delete user.password;
        return user;
    }

    const prisma = getPrisma();
    const user = await prisma.user.update({
        where: { id: userId },
        data: updates
    });

    delete user.password;
    logger.info(`[PERF] User ${userId} profile updated (${Object.keys(updates).join(', ')})`);

    // 🔔 Real-time: Notify admin and sync caches
    await adminBroadcast.notifyUsersChanged({ action: 'profile_updated', userId });

    return user;
};

/**
 * Update password with validation
 */
export const updatePassword = async (userId, currentPassword, newPassword) => {
    // FIXED BUG #9: Password strength validation
    if (!newPassword || newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
    }

    if (newPassword.length > 128) {
        throw new Error('Password too long (max 128 characters)');
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        throw new Error('Password must contain uppercase, lowercase, and numbers');
    }

    // Verify current password
    const user = await userRepository.findUserById(userId, true);
    if (!user) {
        throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new Error('Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 for better security
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await userRepository.updateUserPassword(userId, hashedPassword);
    logger.info(`User ${userId} changed password`);

    // 🔔 Real-time sync
    await adminBroadcast.notifyUsersChanged({ action: 'password_changed', userId });
};

/**
 * Add address with atomic default handling
 */
export const addAddress = async (userId, addressData) => {
    // FIXED BUG #10: Address field validation
    const requiredFields = ['name', 'address', 'city', 'state', 'zipCode', 'country', 'phone'];
    for (const field of requiredFields) {
        if (!addressData[field] || addressData[field].trim().length === 0) {
            throw new Error(`${field} is required`);
        }
    }

    // Validate field lengths
    if (addressData.name.length > 255) throw new Error('Name too long');
    if (addressData.address.length > 500) throw new Error('Address too long');
    if (addressData.city.length > 100) throw new Error('City too long');
    if (addressData.state.length > 100) throw new Error('State too long');
    if (addressData.zipCode.length > 20) throw new Error('Zip code too long');
    if (addressData.country.length > 100) throw new Error('Country too long');
    if (addressData.phone.length > 20) throw new Error('Phone too long');

    // Validate phone format
    if (!/^[\d\s\-\+\(\)]{7,20}$/.test(addressData.phone)) {
        throw new Error('Invalid phone format');
    }

    const prisma = getPrisma();

    // FIXED BUG #8: Use transaction for atomic operation
    return await prisma.$transaction(async (tx) => {
        if (addressData.isDefault) {
            await tx.address.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }

        const address = await tx.address.create({
            data: {
                userId,
                name: addressData.name.trim(),
                address: addressData.address.trim(),
                city: addressData.city.trim(),
                state: addressData.state.trim(),
                zipCode: addressData.zipCode.trim(),
                country: addressData.country.trim(),
                phone: addressData.phone.trim(),
                isDefault: addressData.isDefault || false
            }
        });

        // 🔔 Real-time sync
        await adminBroadcast.notifyUsersChanged({ action: 'address_added', userId });

        return address;
    });
};

/**
 * Update address with atomic default handling
 * OPTIMIZED: Supports _changedFields directive, skips empty updates
 */
export const updateAddress = async (userId, addressId, addressData) => {
    // OPTIMIZATION: Extract _changedFields directive if present
    const frontendChangedFields = addressData._changedFields;
    delete addressData._changedFields;

    const prisma = getPrisma();

    // Verify ownership
    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) {
        throw new Error('Address not found');
    }

    if (existing.userId !== userId) {
        throw new Error('Access denied');
    }

    // OPTIMIZATION: Skip if frontend reports no changes
    if (frontendChangedFields && frontendChangedFields.length === 0) {
        logger.info(`[PERF] Address update skipped - no changes for ${addressId}`);
        return existing;
    }

    // FIXED BUG #10: Validate fields if provided
    const updates = {};

    if (addressData.name) {
        if (addressData.name.length > 255) throw new Error('Name too long');
        updates.name = addressData.name.trim();
    }

    if (addressData.address) {
        if (addressData.address.length > 500) throw new Error('Address too long');
        updates.address = addressData.address.trim();
    }

    if (addressData.city) {
        if (addressData.city.length > 100) throw new Error('City too long');
        updates.city = addressData.city.trim();
    }

    if (addressData.state) {
        if (addressData.state.length > 100) throw new Error('State too long');
        updates.state = addressData.state.trim();
    }

    if (addressData.zipCode) {
        if (addressData.zipCode.length > 20) throw new Error('Zip code too long');
        updates.zipCode = addressData.zipCode.trim();
    }

    if (addressData.country) {
        if (addressData.country.length > 100) throw new Error('Country too long');
        updates.country = addressData.country.trim();
    }

    if (addressData.phone) {
        if (addressData.phone.length > 20) throw new Error('Phone too long');
        if (!/^[\d\s\-\+\(\)]{7,20}$/.test(addressData.phone)) {
            throw new Error('Invalid phone format');
        }
        updates.phone = addressData.phone.trim();
    }

    if (addressData.isDefault !== undefined) {
        updates.isDefault = addressData.isDefault;
    }

    // OPTIMIZATION: Skip transaction if no actual updates
    if (Object.keys(updates).length === 0) {
        logger.info(`[PERF] Address update skipped - empty updates for ${addressId}`);
        return existing;
    }

    // FIXED BUG #8: Use transaction
    return await prisma.$transaction(async (tx) => {
        if (updates.isDefault) {
            await tx.address.updateMany({
                where: { userId, id: { not: addressId } },
                data: { isDefault: false }
            });
        }

        const address = await tx.address.update({
            where: { id: addressId },
            data: updates
        });

        // 🔔 Real-time sync
        await adminBroadcast.notifyUsersChanged({ action: 'address_updated', userId });

        return address;
    });
};

/**
 * Delete address
 */
export const deleteAddress = async (userId, addressId) => {
    const prisma = getPrisma();

    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) {
        throw new Error('Address not found');
    }

    if (existing.userId !== userId) {
        throw new Error('Access denied');
    }

    await prisma.address.delete({ where: { id: addressId } });
    logger.info(`User ${userId} deleted address ${addressId}`);

    // 🔔 Real-time sync
    await adminBroadcast.notifyUsersChanged({ action: 'address_deleted', userId });
};

export default {
    getProfile,
    updateProfile,
    updatePassword,
    addAddress,
    updateAddress,
    deleteAddress
};
