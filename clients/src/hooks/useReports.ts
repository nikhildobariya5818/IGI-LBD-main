// hooks/useReports.ts
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../lib/apiClient"
import { QUERY_KEYS } from "../lib/queryKeys"
import type { AxiosProgressEvent } from "axios"

type UploadProgress = (ev: AxiosProgressEvent | ProgressEvent) => void

export function useUploadPdf() {
  const qc = useQueryClient()
  return useMutation<any, Error, { file: File; proportions?: any; onUploadProgress?: (e: any) => void }>({
    mutationFn: ({ file, proportions, onUploadProgress }) =>
      apiClient.uploadPdf(file, { proportions, onUploadProgress }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.reports.all() })
    },
  })
}

export function useMiniReports() {
  const qc = useQueryClient()
  return useMutation<any, Error, { files: File[]; onUploadProgress?: (e: any) => void }>({
    mutationFn: ({ files, onUploadProgress }) => apiClient.uploadMiniReports(files, { onUploadProgress }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.reports.all() })
    },
  })
}

export type ExportResult = { blob: Blob; filename?: string }

export function useExportBackup(options?: {
  onSuccess?: (fileUrl: string | null) => void
  onError?: (err: unknown) => void
}) {
  return useMutation<ExportResult, Error, void, unknown>({
    mutationFn: async (): Promise<ExportResult> => {
      return apiClient.exportBackup()
    },
    onError: (err) => {
      options?.onError?.(err)
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data?.filename ?? null)
    },
  })
}

export function useImportBackup(options?: {
  onSuccess?: (res: any) => void
  onError?: (err: unknown) => void
}) {
  const qc = useQueryClient()

  return useMutation<any, Error, File, unknown>({
    mutationFn: (file: File) => apiClient.importBackup(file),
    onError: (err) => {
      options?.onError?.(err)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.reports.all() })
      options?.onSuccess?.(res)
    },
  })
}

export function useUploadIGIReport() {
  const qc = useQueryClient()
  return useMutation<any, Error, { file: File; clientName?: string; onUploadProgress?: (e: any) => void }>({
    mutationFn: ({ file, clientName, onUploadProgress }) =>
      apiClient.uploadIGIReport(file, { clientName, onUploadProgress }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.reports.all() })
    },
  })
}
