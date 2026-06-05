type Props = {
  name: string;
  value: boolean | null;
};

export function MetRadio({ name, value }: Props) {
  return (
    <div className="flex gap-3 justify-center">
      <label className="inline-flex items-center gap-1 text-xs">
        <input type="radio" name={name} value="true" defaultChecked={value === true} />
        Sí
      </label>
      <label className="inline-flex items-center gap-1 text-xs">
        <input type="radio" name={name} value="false" defaultChecked={value === false} />
        No
      </label>
      <label className="inline-flex items-center gap-1 text-xs text-gray-500">
        <input type="radio" name={name} value="" defaultChecked={value === null} />
        —
      </label>
    </div>
  );
}
