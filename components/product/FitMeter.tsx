interface FitMeterProps {
  readonly fit: string;
}

export function FitMeter({ fit }: FitMeterProps) {
  return (
    <div className="fit-meter">
      <div className="fit-meter__labels">
        <span>Runs smaller</span>
        <span>True to size</span>
        <span>Runs larger</span>
      </div>
      <div className="fit-meter__track" />
      <small>{fit}</small>
    </div>
  );
}
