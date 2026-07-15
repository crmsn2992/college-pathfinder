function StepMajor({
  profile,
  toggleArrayItem,
  onUnsureClick,
}: {
  profile: StudentProfile;
  toggleArrayItem: (key: keyof StudentProfile, item: string) => void;
  onUnsureClick: () => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">What do you want to study? 🎓</h2>
      <p className="text-sm text-muted">
        Select the fields you&apos;re interested in. You can pick multiple if you&apos;re considering different paths.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {INTENDED_MAJORS.map(major => (
          <button
            key={major}
            onClick={() => {
              if (major === 'Unsure / Exploring') {
                // Add to profile AND show quiz
                toggleArrayItem('intendedMajors', major);
                setTimeout(() => onUnsureClick(), 0);
              } else {
                toggleArrayItem('intendedMajors', major);
              }
            }}
            className={`rounded-lg border px-3 py-2.5 text-sm text-left font-medium transition-colors ${
              profile.intendedMajors.includes(major)
                ? major === 'Unsure / Exploring'
                  ? 'border-secondary bg-secondary/10 text-secondary'
                  : 'border-primary bg-primary/10 text-primary'
                : 'border-card-border hover:border-primary/50'
            }`}
          >
            {major}
          </button>
        ))}
      </div>

      {profile.intendedMajors.includes('Unsure / Exploring') && (
        <div className="rounded-lg bg-secondary/5 border border-secondary/20 p-3">
          <p className="text-xs text-secondary">
            💡 Great! We&apos;ll suggest colleges and paths across multiple fields so you can explore your options.
          </p>
        </div>
      )}

      {profile.intendedMajors.length > 0 && !profile.intendedMajors.includes('Unsure / Exploring') && (
        <p className="text-xs text-muted">{profile.intendedMajors.length} field(s) selected</p>
      )}
    </div>
  );
}
