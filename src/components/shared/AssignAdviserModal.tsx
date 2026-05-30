import { useState }              from "react";
import { X, UserCheck }           from "lucide-react";
import { Button }                 from "../ui/button";
import { useAdvisers }            from "../../hooks/useAdvisers";
import { useReassignAdviser }     from "../../hooks/useReassignAdviser";

interface AssignAdviserModalProps {
  clientIds:           string[];
  clientLabel:         string;    // "James Smith" or "47 clients"
  currentAdviserName?: string;    // shown only for single-client flow
  onClose:             () => void;
  onSuccess?:          () => void;
}

export function AssignAdviserModal({
  clientIds,
  clientLabel,
  currentAdviserName,
  onClose,
  onSuccess,
}: AssignAdviserModalProps) {
  const { data: advisers = [] }      = useAdvisers();
  const { mutate: reassign, isPending } = useReassignAdviser();
  const [selectedId, setSelectedId]  = useState("");
  const [error, setError]            = useState<string | null>(null);

  function handleConfirm() {
    if (!selectedId) return;
    setError(null);
    reassign(
      { clientIds, newAdviserId: selectedId },
      {
        onSuccess: () => { onSuccess?.(); onClose(); },
        onError:   () => setError("Failed to reassign. Please try again."),
      }
    );
  }

  const selectedAdviser = advisers.find((a) => a.id === selectedId);
  const isBulk          = clientIds.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#002147]" />
            <h2 className="text-sm font-semibold text-[#0F172A]">Reassign Adviser</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-500 leading-relaxed">
            Reassigning adviser for{" "}
            <span className="font-medium text-[#0F172A]">{clientLabel}</span>
            {currentAdviserName && (
              <>
                {" "}— currently with{" "}
                <span className="font-medium text-[#0F172A]">{currentAdviserName}</span>
              </>
            )}
            .
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              New adviser
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002147] focus:border-[#002147] cursor-pointer"
            >
              <option value="" disabled>Select an adviser…</option>
              {advisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.first_name} {a.last_name}
                </option>
              ))}
            </select>
          </div>

          {selectedAdviser && (
            <p className="text-xs text-[#002147] bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              {isBulk
                ? `${clientIds.length} clients`
                : clientLabel}{" "}
              will be moved to{" "}
              <span className="font-semibold">
                {selectedAdviser.first_name} {selectedAdviser.last_name}
              </span>
              .
            </p>
          )}

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedId || isPending}
          >
            {isPending
              ? "Saving…"
              : isBulk
                ? `Reassign ${clientIds.length} clients`
                : "Reassign"}
          </Button>
        </div>

      </div>
    </div>
  );
}
