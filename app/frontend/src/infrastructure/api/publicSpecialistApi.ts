import apiClient from "./apiClient";
import type { PublicSpecialistProfile } from "@/domain/models/SpecialistProfileTypes";

export const publicSpecialistApi = {
  getPublicProfile: async (userId: string): Promise<PublicSpecialistProfile> => {
    const response = await apiClient.get<PublicSpecialistProfile>(`/specialists/${userId}/public`);
    return response.data;
  },
};
