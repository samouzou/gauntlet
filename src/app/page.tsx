import Link from 'next/link';
import { JobBoard } from '@/components/jobs/JobBoard';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="w-full">
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-4 mb-16 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl animate-pulse-soft" />
          <div className="absolute right-[10%] top-[20%] h-40 w-40 rounded-full bg-sky-500/10 blur-2xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
            }}
          />
        </div>

        <p className="font-display text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tight text-foreground animate-fade-up">
          Outpost
        </p>
        <h1 className="mt-4 max-w-2xl text-xl sm:text-2xl text-muted-foreground font-normal animate-fade-up [animation-delay:80ms]">
          Remote roles, worldwide. No offices required.
        </h1>
        <p className="mt-3 max-w-lg text-sm sm:text-base text-muted-foreground/90 animate-fade-up [animation-delay:140ms]">
          Browse free. Employers post when they&apos;re ready to hire.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up [animation-delay:200ms]">
          <Button asChild size="lg" className="px-8">
            <a href="#jobs">Find a role</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/employer">Post a job</Link>
          </Button>
        </div>
      </section>

      <div id="jobs">
        <JobBoard />
      </div>
    </div>
  );
}
