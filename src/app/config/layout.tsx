import { ConfigSubnav } from "@/components/layout/ConfigSubnav";

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl">
      <ConfigSubnav />
      {children}
    </div>
  );
}
