// lib/apiClient.ts
import { createAxiosClient } from "./axiosClient";
import type { AxiosProgressEvent } from "axios";
import { appendFormData } from "./formHelpers";

/* ---------------------------------- TYPES ---------------------------------- */

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface LocationData {
  address: string;
  city: string;
  state: string;
  country: string;
}

// Response shape returned by POST /extract-igi-report - matches main.py
// exactly. This endpoint does NOT use the generic ApiResponse<T> envelope
// (no top-level `success`/`error`) - it returns this shape directly.
export interface IGIReportApiResponse {
  data: Record<string, any>;
  report_number: string;
  images: Record<string, string>;
  image_urls: Record<string, string>;
}

export interface LBDImageReportApiResponse {
  success: boolean;
  page_width: number;
  page_height: number;
  report_number?: string;
  images: Record<"page1" | "page2" | "page3" | "page4", string>;
}

export type UploadProgress = (ev: AxiosProgressEvent | ProgressEvent) => void;

/* --------------------------------- ERRORS ---------------------------------- */

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status = 500, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function handleAxiosError(err: unknown): never {
  if (typeof err === "object" && err !== null) {
    const e = err as {
      response?: { status: number; data?: unknown };
      request?: unknown;
      message?: string;
    };

    if (e.response) {
      const status = e.response.status;
      // const payload = e.response.data as ApiResponse;
      // throw new ApiError(
      //   payload?.message ?? e.message ?? "API error",
      //   status,
      //   payload
      // );
      const payload = e.response.data as any;

      const message =
        payload?.message ||
        payload?.detail?.[0]?.msg ||
        payload?.detail ||
        e.message ||
        "API Error";

      throw new ApiError(message, status, payload);
    }

    if (e.request) {
      throw new ApiError("No response from server", 0, {
        details: e.message,
      });
    }

    throw new ApiError(e.message ?? "Unknown error", 0);
  }

  throw new ApiError("Unknown error", 0);
}

/* -------------------------------- API CLIENT -------------------------------- */

export const apiClient = {
  // ✅ PDF upload
  uploadPdf: async <T = unknown>(
    file: File,
    opts?: {
      token?: string;
      proportions?: Record<string, unknown>;
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    }
  ): Promise<T> => {
    try {
      const axios = createAxiosClient({ token: opts?.token });
      const form = new FormData();

      form.append("file", file);
      // form.append("pdf", file);

      if (opts?.proportions !== undefined) {
        appendFormData(form, opts.proportions, "proportions");
      }

      const res = await axios.post<ApiResponse<T>>(
        "/pdf/upload-pdf/",
        form,
        {
          onUploadProgress: opts?.onUploadProgress,
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (res.data?.success === false) {
        throw new ApiError(
          res.data?.error || "PDF upload failed",
          400,
          res.data
        );
      }

      return (res.data?.data ?? res.data) as T;
    } catch (err) {
      handleAxiosError(err);
    }
  },

  // ✅ Mini reports upload
  uploadMiniReports: async <T = unknown>(
    files: File[],
    opts?: {
      token?: string;
      locationData?: LocationData;
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    }
  ): Promise<T> => {
    try {
      const axios = createAxiosClient({ token: opts?.token });
      const form = new FormData();

      files.forEach((file) => {
        form.append("files", file);
      });

      if (opts?.locationData) {
        form.append("address", opts.locationData.address);
        form.append("city", opts.locationData.city);
        form.append("state", opts.locationData.state);
        form.append("country", opts.locationData.country);
      }

      const res = await axios.post<ApiResponse<T>>(
        "/pdf/small-reports",
        form,
        {
          onUploadProgress: opts?.onUploadProgress,
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (res.data?.success === false) {
        throw new ApiError(
          res.data?.error || "Mini reports upload failed",
          400,
          res.data
        );
      }

      return res.data as T;
    } catch (err) {
      handleAxiosError(err);
    }
  },

  // ✅ IGI report upload
  //
  // NOTE: /extract-igi-report returns its own shape directly -
  // { data, report_number, images, image_urls } - it is NOT wrapped in the
  // generic ApiResponse<T> envelope used by the other endpoints above (no
  // top-level `success`/`error`). Unwrapping `res.data.data` here (like
  // uploadPdf does) would discard `images` and `image_urls`, which was the
  // bug causing the caller to only receive the flat report fields. So this
  // method returns `res.data` as-is instead.
  uploadIGIReport: async <T = IGIReportApiResponse>(
    file: File,
    opts?: {
      token?: string;
      clientName?: string;
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    }
  ): Promise<T> => {
    try {
      const axios = createAxiosClient({ token: opts?.token });
      const form = new FormData();

      form.append("file", file);
      // form.append("pdf", file);

      if (opts?.clientName) {
        form.append("clientName", opts.clientName);
      }

      const res = await axios.post<T>(
        "/extract-igi-report",
        form,
        {
          onUploadProgress: opts?.onUploadProgress,
          headers: {
            Accept: "application/json",
          },
        }
      );

      return res.data as T;
    } catch (err) {
      handleAxiosError(err);
    }
  },

  // Returns the four pre-rendered vertical panels for an LBD report.
  // extractLBDReportImages: async <T = LBDImageReportApiResponse>(
  //   file: File,
  //   opts?: {
  //     token?: string;
  //     onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  //   }
  // ): Promise<T> => {
  //   try {
  //     const axios = createAxiosClient({ token: opts?.token });
  //     const form = new FormData();
  //     // form.append("file", file);
  //     form.append("pdf", file);

  //     const res = await axios.post<T>("/extract-igi-report", form, {
  //       onUploadProgress: opts?.onUploadProgress,
  //       headers: { Accept: "application/json" },
  //     });

  //     return res.data as T;
  //   } catch (err) {
  //     handleAxiosError(err);
  //   }
  // },

  extractLBDReportImages: async (
    file: File,
    opts?: {
      token?: string;
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    }
  ): Promise<LBDImageReportApiResponse> => {
    try {
      const axios = createAxiosClient({ token: opts?.token });

      const form = new FormData();
      // form.append("pdf", file); // <-- IMPORTANT
      form.append("file", file);

      const res = await axios.post<LBDImageReportApiResponse>(
        "/extract-igi-report",
        form,
        {
          onUploadProgress: opts?.onUploadProgress,
        }
      );

      return res.data;
    } catch (err) {
      handleAxiosError(err);
    }
  },


  // 🚧 Not implemented
  exportBackup: async (): Promise<{ blob: Blob; filename?: string }> => {
    throw new ApiError("Export backup not implemented", 501);
  },

  importBackup: async (_file: File): Promise<unknown> => {
    throw new ApiError("Import backup not implemented", 501);
  },
};