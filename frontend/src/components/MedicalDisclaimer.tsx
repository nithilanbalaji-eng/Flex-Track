/**
 * Fitness advice disclaimer.
 *
 * Deliberately low-contrast and small: present for anyone who looks for it,
 * without competing with the content. Apple scrutinises health and fitness
 * apps for medical claims, so this needs to stay on any screen that prescribes
 * training.
 */
export function MedicalDisclaimer() {
  return (
    <p className="mt-8 px-2 pb-2 text-center text-[11px] leading-relaxed text-slate-300">
      We're not medical professionals. Always consult a doctor before starting a new exercise programme.
    </p>
  );
}
