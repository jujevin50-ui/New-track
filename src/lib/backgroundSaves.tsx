import { toast } from 'sonner';

interface SaveJob {
  write: () => Promise<unknown>;
  errorMessage: string;
  onDiscard?: () => void;
}

const jobs: SaveJob[] = [];
const notificationId = 'background-saves';
let notificationVisible = false;
let active = false;

const warnOnLeave = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = '';
};

export const hasBackgroundSaves = () => jobs.length > 0;

const showPending = () => {
  notificationVisible = true;
  toast.loading('Enregistrement en arrière-plan…', {
    id: notificationId, dismissible: false, action: undefined, cancel: undefined,
  });
};

async function drain() {
  const notify = window.setTimeout(showPending, 350);

  while (jobs.length) {
    const job = jobs[0];
    try {
      await job.write();
      jobs.shift();
    } catch {
      window.clearTimeout(notify);
      notificationVisible = true;
      let resolved = false;
      const resume = (discard: boolean) => {
        if (resolved) return;
        resolved = true;
        if (discard) {
          jobs.shift();
          job.onDiscard?.();
        }
        if (jobs.length) showPending();
        window.setTimeout(drain, 0);
      };
      toast.error(job.errorMessage, {
        id: notificationId,
        duration: Infinity,
        dismissible: false,
        description: 'La saisie est conservée. Les sauvegardes suivantes attendent.',
        action: { label: 'Réessayer', onClick: event => { event.preventDefault(); resume(false); } },
        cancel: <button type="button" data-button data-cancel onClick={() => resume(true)}>Abandonner</button>,
      });
      return;
    }
  }

  window.clearTimeout(notify);
  active = false;
  window.removeEventListener('beforeunload', warnOnLeave);
  if (notificationVisible) toast.dismiss(notificationId);
  notificationVisible = false;
}

export function queueBackgroundSave(write: SaveJob['write'], errorMessage: string, onDiscard?: () => void) {
  jobs.push({ write, errorMessage, onDiscard });
  if (!active) {
    active = true;
    window.addEventListener('beforeunload', warnOnLeave);
    // Let the acceptance state paint before encoding or writing the snapshot.
    window.setTimeout(drain, 32);
  }
}
