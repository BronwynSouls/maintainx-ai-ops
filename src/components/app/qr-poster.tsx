import * as React from "react";
import QRCode from "qrcode";
import { ScanLine, ClipboardList, BellRing, Printer, Download } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { Button } from "@/components/ui/button";

export const REPORT_URL = "https://maintainx-ai-ops.lovable.app/report";

const STEPS = [
  {
    icon: ScanLine,
    title: "SCAN",
    body: "Scan the QR code with your phone",
  },
  {
    icon: ClipboardList,
    title: "REPORT",
    body: "Describe the maintenance issue and submit",
  },
  {
    icon: BellRing,
    title: "WE'LL ACT",
    body: "Our team will be notified and take action",
  },
];

export function QrPoster() {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    QRCode.toDataURL(REPORT_URL, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, []);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "maintainx-report-qr.png";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={downloadQr} disabled={!qrDataUrl}>
          <Download className="size-4" aria-hidden /> Download QR (PNG)
        </Button>
        <Button variant="brand" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden /> Print poster
        </Button>
      </div>

      {/* Poster */}
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-white shadow-xl print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        {/* Header band */}
        <div className="bg-navy px-6 py-6 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex items-center gap-2.5">
              <Brand compact className="[&_img]:bg-white/15" />
              <span className="flex flex-col leading-none">
                <span className="text-lg font-bold tracking-tight text-white">MaintainX</span>
                <span className="text-[10px] font-medium tracking-[0.14em] text-azure uppercase">
                  Consulting Group
                </span>
              </span>
            </span>
            <span className="border border-gold/60 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-gold uppercase">
              Guest Services
            </span>
          </div>
        </div>

        <div className="border-b-2 border-gold" />

        {/* Body */}
        <div className="px-6 py-8 text-center sm:px-10">
          <p className="text-xs font-semibold tracking-[0.25em] text-brand uppercase">
            In-Room Maintenance Request
          </p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
            HELP US KEEP YOUR STAY PERFECT
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Scan the QR code to report any maintenance issue.
          </p>

          {/* QR code — high contrast, generous quiet zone */}
          <div className="mx-auto mt-6 inline-block rounded-xl border border-border bg-white p-5 shadow-sm sm:p-7">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code linking to the MaintainX maintenance report form"
                className="mx-auto block size-56 sm:size-64"
              />
            ) : (
              <div className="size-56 animate-pulse rounded-md bg-muted sm:size-64" />
            )}
          </div>
          <p className="mt-3 font-mono text-[11px] break-all text-muted-foreground">{REPORT_URL}</p>

          {/* Steps */}
          <ol className="mt-8 grid gap-4 text-left sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-border bg-muted/60 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <step.icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.18em] text-brand">
                    STEP {i + 1}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold tracking-wide text-navy">{step.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>

          {/* Non-technical instruction */}
          <p className="mx-auto mt-8 max-w-lg rounded-lg border border-azure bg-accent px-4 py-3 text-sm text-accent-foreground">
            Don't have a smartphone? Please contact the{" "}
            <span className="font-semibold">Reception Desk</span> for assistance.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-navy px-6 py-5 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">Thank You</p>
          <p className="mt-1 text-sm text-white/80">Your comfort is our priority.</p>
        </div>
      </div>
    </div>
  );
}
