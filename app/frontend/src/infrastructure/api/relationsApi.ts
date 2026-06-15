import apiClient from "./apiClient";
import type { Relation } from "@/domain/models/Relation";

export const relationsApi = {
  request: async (targetUserId: string): Promise<Relation> => {
    const response = await apiClient.post<Relation>("/relations/request", {
      target_user_id: targetUserId,
    });
    return response.data;
  },

  getPending: async (): Promise<Relation[]> => {
    const response = await apiClient.get<Relation[]>("/relations/pending");
    return response.data;
  },

  getSent: async (): Promise<Relation[]> => {
    const response = await apiClient.get<Relation[]>("/relations/sent");
    return response.data;
  },

  getApproved: async (): Promise<Relation[]> => {
    const response = await apiClient.get<Relation[]>("/relations/approved");
    return response.data;
  },

  approve: async (relationId: string): Promise<Relation> => {
    const response = await apiClient.patch<Relation>(`/relations/${relationId}`, {
      action: "approve",
    });
    return response.data;
  },

  reject: async (relationId: string): Promise<Relation> => {
    const response = await apiClient.patch<Relation>(`/relations/${relationId}`, {
      action: "reject",
    });
    return response.data;
  },

  revoke: async (relationId: string): Promise<Relation> => {
    const response = await apiClient.patch<Relation>(`/relations/${relationId}`, {
      action: "revoke",
    });
    return response.data;
  },
};
