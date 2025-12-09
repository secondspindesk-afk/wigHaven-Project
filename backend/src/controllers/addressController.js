import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

export const getUserAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const prisma = getPrisma();

        const addresses = await prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
        });

        res.json({ success: true, data: addresses });
    } catch (error) {
        logger.error('Get addresses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch addresses' });
    }
};

export const createAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, street, city, state, zipCode, country, phone, isDefault } = req.body;
        const prisma = getPrisma();

        // If this is set as default, unset other defaults
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const address = await prisma.address.create({
            data: {
                userId,
                name,
                address: street,
                city,
                state,
                zipCode,
                country,
                phone,
                isDefault: isDefault || false
            }
        });

        res.status(201).json({ success: true, data: address });
    } catch (error) {
        logger.error('Create address error:', error);
        res.status(500).json({ success: false, message: 'Failed to create address' });
    }
};

export const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { name, street, city, state, zipCode, country, phone, isDefault } = req.body;
        const prisma = getPrisma();

        // Verify ownership
        const existing = await prisma.address.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId, isDefault: true, id: { not: id } },
                data: { isDefault: false }
            });
        }

        const address = await prisma.address.update({
            where: { id },
            data: {
                name,
                address: street,
                city,
                state,
                zipCode,
                country,
                phone,
                isDefault
            }
        });

        res.json({ success: true, data: address });
    } catch (error) {
        logger.error('Update address error:', error);
        res.status(500).json({ success: false, message: 'Failed to update address' });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const prisma = getPrisma();

        // Verify ownership
        const existing = await prisma.address.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        await prisma.address.delete({ where: { id } });

        res.json({ success: true, message: 'Address deleted' });
    } catch (error) {
        logger.error('Delete address error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
};

export default {
    getUserAddresses,
    createAddress,
    updateAddress,
    deleteAddress
};
