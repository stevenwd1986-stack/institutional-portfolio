import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ImportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ImportJob {
  id:             string;
  source:         "FINIO" | "TRANSACT" | "CSV";
  status:         ImportStatus;
  rows_total:     number;
  rows_processed: number;
  rows_failed:    number;
  storage_path:   string | null;
  error_log:      { row: number; message: string }[] | null;
  started_at:     string | null;
  completed_at:   string | null;
  created_at:     string;
}

const DEMO_JOBS: ImportJob[] = [
  {
    id:             "j1",
    source:         "CSV",
    status:         "COMPLETED",
    rows_total:     243,
    rows_processed: 241,
    rows_failed:    2,
    storage_path:   "imports/transact-export-2026-05-01.csv",
    error_log:      [
      { row: 87,  message: "Invalid date format: \"05-2026-01\"" },
      { row: 194, message: "Unknown transaction type: \"REINVESTMENT\"" },
    ],
    started_at:   "2026-05-20T10:14:22Z",
    completed_at: "2026-05-20T10:14:35Z",
    created_at:   "2026-05-20T10:14:00Z",
  },
  {
    id:             "j2",
    source:         "FINIO",
    status:         "COMPLETED",
    rows_total:     118,
    rows_processed: 118,
    rows_failed:    0,
    storage_path:   "imports/finio-2026-04-30.csv",
    error_log:      null,
    started_at:   "2026-04-30T17:02:05Z",
    completed_at: "2026-04-30T17:02:12Z",
    created_at:   "2026-04-30T17:02:00Z",
  },
  {
    id:             "j3",
    source:         "TRANSACT",
    status:         "FAILED",
    rows_total:     0,
    rows_processed: 0,
    rows_failed:    0,
    storage_path:   "imports/transact-bad-encoding.csv",
    error_log:      [{ row: 0, message: "File encoding error — expected UTF-8, got Windows-1252" }],
    started_at:   "2026-04-15T09:30:01Z",
    completed_at: "2026-04-15T09:30:02Z",
    created_at:   "2026-04-15T09:30:00Z",
  },
];

export function useImportJobs() {
  return useQuery<ImportJob[]>({
    queryKey: ["import-jobs"],
    queryFn:  async () => DEMO_JOBS,
    staleTime: 1000 * 30,
    placeholderData: DEMO_JOBS,
  });
}

export interface UploadResult {
  job_id: string;
  status: ImportStatus;
  rows_processed: number;
  rows_failed: number;
}

export function useUploadCSV() {
  const qc = useQueryClient();

  return useMutation<UploadResult, Error, { file: File; source: "CSV" | "FINIO" | "TRANSACT" }>({
    mutationFn: async ({ file, source }) => {
      // Demo: simulate upload + processing
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

      const newJob: ImportJob = {
        id:             `j${Date.now()}`,
        source,
        status:         "COMPLETED",
        rows_total:     Math.floor(50 + Math.random() * 200),
        rows_processed: 0,
        rows_failed:    0,
        storage_path:   `imports/${file.name}`,
        error_log:      null,
        started_at:     new Date().toISOString(),
        completed_at:   new Date().toISOString(),
        created_at:     new Date().toISOString(),
      };
      newJob.rows_processed = newJob.rows_total - Math.floor(Math.random() * 3);
      newJob.rows_failed    = newJob.rows_total - newJob.rows_processed;

      // Prepend to demo cache
      qc.setQueryData<ImportJob[]>(["import-jobs"], (old) => [newJob, ...(old ?? [])]);

      return {
        job_id:         newJob.id,
        status:         newJob.status,
        rows_processed: newJob.rows_processed,
        rows_failed:    newJob.rows_failed,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["import-jobs"] });
    },
  });
}
