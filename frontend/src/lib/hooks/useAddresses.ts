import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import { Address, CreateAddressData, UpdateAddressData } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils/errorUtils';

export function useAddresses() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { data: addresses = [], isLoading } = useQuery({
        queryKey: ['addresses'],
        queryFn: async () => {
            const response = await api.get<{ data: Address[] }>('/addresses');
            return response.data.data;
        },
    });

    const addAddress = useMutation({
        mutationFn: async (data: CreateAddressData) => {
            const response = await api.post<{ data: Address }>('/addresses', data);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            showToast('Address added successfully', 'success');
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to add address'), 'error');
        },
    });

    const updateAddress = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateAddressData }) => {
            const response = await api.patch<{ data: Address }>(`/addresses/${id}`, data);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            showToast('Address updated successfully', 'success');
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to update address'), 'error');
        },
    });

    const deleteAddress = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/addresses/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            showToast('Address deleted successfully', 'success');
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to delete address'), 'error');
        },
    });

    const setDefaultAddress = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.patch<{ data: Address }>(`/addresses/${id}`, { isDefault: true });
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            showToast('Default address updated', 'success');
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to set default address'), 'error');
        },
    });

    return {
        addresses,
        isLoading,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
    };
}
