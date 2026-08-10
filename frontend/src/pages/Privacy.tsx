import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

/**
 * Privacy policy.
 *
 * Public (no sign-in required) because the App Store review form, Google
 * AdSense and Apple's HealthKit rules all need a reachable URL. Note the
 * HealthKit commitments below are not optional marketing copy - Apple rejects
 * apps that use health data for advertising, and the policy has to say so.
 */

const LAST_UPDATED = "10 August 2026";
const CONTACT_EMAIL = "support@flextrack.app";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export function Privacy() {
  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[560px] bg-white px-5 pb-16 shadow-xl sm:border-x sm:border-slate-200">
        <header className="flex items-center justify-between py-5">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/login" className="text-sm font-medium text-brand-600">
            Sign in
          </Link>
        </header>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-sm text-slate-400">Last updated {LAST_UPDATED}</p>

        <p className="mt-5 text-sm leading-relaxed text-slate-600">
          Flex Track helps you plan workouts with friends, log training, and track calories. This policy
          explains what we collect, why, and what control you have over it.
        </p>

        <Section title="What we collect">
          <p>
            <strong className="text-slate-800">Account details.</strong> Your name and email address. If you
            sign in with Google or Apple we receive a unique identifier and your email from them — never your
            password.
          </p>
          <p>
            <strong className="text-slate-800">Profile details you choose to enter.</strong> Age, sex, height,
            weight, training goal, experience level and any injuries you describe. These are used to calculate
            your calorie targets and to personalize AI-generated workout plans.
          </p>
          <p>
            <strong className="text-slate-800">Training and nutrition data.</strong> Workout plans, gym
            check-ins, session notes and food entries you record.
          </p>
          <p>
            <strong className="text-slate-800">Health data you connect.</strong> If you enable Apple Health
            syncing, we receive the workouts and active energy you choose to share.
          </p>
        </Section>

        <Section title="Health and fitness data">
          <p>
            We treat health data as sensitive and hold it to stricter rules than anything else:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>It is never used for advertising or marketing.</li>
            <li>It is never sold, rented, or shared with data brokers.</li>
            <li>It is used only to show you your own training and nutrition information inside the app.</li>
            <li>Apple Health syncing is entirely optional and can be disconnected at any time.</li>
          </ul>
          <p>
            You can revoke access whenever you like by rotating or removing your sync key in Settings, or by
            revoking permission on your device.
          </p>
        </Section>

        <Section title="How your information is used">
          <ul className="ml-4 list-disc space-y-1">
            <li>To operate your account and keep you signed in.</li>
            <li>To calculate calorie and macro targets from your profile.</li>
            <li>To generate personalized workout plans.</li>
            <li>To show plans to crew members you deliberately share them with.</li>
            <li>To send account emails, such as password resets.</li>
          </ul>
        </Section>

        <Section title="Who we share it with">
          <p>
            We do not sell your personal information. We share it only with the services that make the app
            work:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-slate-800">Supabase</strong> — database hosting.
            </li>
            <li>
              <strong className="text-slate-800">Render</strong> and{" "}
              <strong className="text-slate-800">Vercel</strong> — application hosting.
            </li>
            <li>
              <strong className="text-slate-800">Anthropic</strong> — when you use the AI coach, the profile
              answers from that questionnaire are sent to generate your plan. Your name, email and training
              history are not.
            </li>
            <li>
              <strong className="text-slate-800">Resend</strong> — sending account emails.
            </li>
            <li>
              <strong className="text-slate-800">Google or Apple</strong> — only if you choose to sign in with
              them.
            </li>
            <li>
              <strong className="text-slate-800">Payment providers</strong> — if you subscribe. Card details go
              directly to them and never reach our servers.
            </li>
          </ul>
          <p>
            Crew members can see plans shared with the crew, and the name and email on your profile. Nothing
            else — your logs, calories and health data stay private to you.
          </p>
        </Section>

        <Section title="Advertising">
          <p>
            The free version of Flex Track shows ads. Advertising is never targeted using your health, fitness
            or nutrition data. A Premium subscription removes ads entirely.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            <strong className="text-slate-800">Delete your account at any time</strong> from Settings. This
            permanently removes your profile, logs, calorie entries, health sync history and the plans you
            created. It cannot be undone and it is not a deactivation.
          </p>
          <p>
            You can also edit or clear profile fields whenever you want, and request a copy of your data by
            emailing us.
          </p>
        </Section>

        <Section title="Keeping it secure">
          <p>
            Passwords are stored hashed with bcrypt and never in readable form. Traffic is encrypted in transit.
            Password reset links are stored only as hashes, expire after an hour, and work once.
          </p>
          <p>
            No system is perfectly secure, but we aim not to hold anything we don't need.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Your data is kept while your account exists. Deleting your account removes it from our live
            database immediately; routine encrypted backups may retain copies for a short period before they
            expire.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Flex Track isn't intended for children under 13, and we don't knowingly collect their information.
            If you believe a child has created an account, contact us and we'll remove it.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes materially, we'll update the date at the top and notify you in the app.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, or want a copy of your data? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-600">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <div className="mt-10 border-t border-slate-100 pt-5">
          <Link to="/login" className="btn-secondary w-full">
            Back to Flex Track
          </Link>
        </div>
      </div>
    </div>
  );
}
