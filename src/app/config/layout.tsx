import { ConfigSubnav } from "@/components/layout/ConfigSubnav";

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      <ConfigSubnav />
      {children}
    </div>
  );
}
