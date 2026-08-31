import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDirectory } from "@/lib/directory.functions";
import { submitMaintenanceRequest, type SubmitResult } from "@/lib/tickets.functions";
import { PriorityBadge, StatusBadge } from "./badges";
import { t } from "@/lib/i18n";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export function MaintenanceRequestForm({
  presetHotelId,
  presetLocationId,
  reporterType = "guest",
  compact = false,
  onSubmitted,
}: {
  presetHotelId?: string | null;
  presetLocationId?: string | null;
  reporterType?: "guest" | "receptionist" | "hotel_manager";
  compact?: boolean;
  onSubmitted?: () => void;
}) {
  const loadDirectory = useServerFn(getDirectory);
  const submit = useServerFn(submitMaintenanceRequest);

  const { data: directory, isLoading } = useQuery({
    queryKey: ["directory"],
    queryFn: () => loadDirectory(),
    staleTime: 5 * 60_000,
  });

  const [hotelId, setHotelId] = useState(presetHotelId ?? "");
  const [locationId, setLocationId] = useState(presetLocationId ?? "");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [notifyReporter, setNotifyReporter] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [inputMethod, setInputMethod] = useState<"text" | "voice" | "image">("text");
  const [transcription, setTranscription] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (presetHotelId) setHotelId(presetHotelId);
    if (presetLocationId) setLocationId(presetLocationId);
  }, [presetHotelId, presetLocationId]);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    setSpeechSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  const locations = (directory?.locations ?? []).filter((l) => l.hotel_id === hotelId);

  function toggleVoice() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += `${event.results[i]?.[0]?.transcript ?? ""} `;
      }
      const clean = text.trim();
      setTranscription(clean);
      setDescription(clean);
      setInputMethod("voice");
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice input failed. Please type the problem instead.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large. Please use a photo under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result));
      setInputMethod((m) => (m === "voice" ? m : "image"));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!hotelId) return setError("Please select the hotel.");
    if (!locationId && !locationText.trim())
      return setError("Please tell us the room or location.");
    if (description.trim().length < 5)
      return setError("Please describe the problem in a few words.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError("Enter a valid email address.");

    setPending(true);
    try {
      const response = await submit({
        data: {
          hotelId,
          locationId: locationId || null,
          locationText: locationText.trim(),
          description: description.trim(),
          reporterEmail: email.trim(),
          notifyReporter: notifyReporter && Boolean(email.trim()),
          reporterType,
          inputMethod,
          transcription,
          language: "en",
          imageDataUrl,
        },
      });
      setResult(response);
      onSubmitted?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't submit your request. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div className="surface-panel space-y-4 p-6" role="status">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-6 text-status-resolved" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">Request submitted</h2>
            <p className="text-sm text-muted-foreground">
              Your ticket number is{" "}
              <span className="font-semibold text-foreground">{result.ticketNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="new" />
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" aria-hidden /> AI Classification
          </p>
          {result.ai.ok ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-36 shrink-0 text-muted-foreground">Category</dt>
                <dd className="font-medium">{result.ai.categoryName}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="w-36 shrink-0 text-muted-foreground">Suggested Priority</dt>
                <dd>
                  <PriorityBadge priority={result.ai.priority as "critical" | "medium" | "low"} />
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 shrink-0 text-muted-foreground">Reason</dt>
                <dd className="text-muted-foreground">{result.ai.reason}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              AI classification is unavailable right now, so the ticket was saved and flagged for
              manual classification by the maintenance team.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            AI classification is a recommendation — the maintenance team makes the final decision.
          </p>
        </div>

        {result.guidance.ok && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="size-4 text-primary" aria-hidden /> Immediate guidance while
              we arrange maintenance
            </p>
            <p className="mt-2 text-sm">{result.guidance.guidance}</p>
            {result.guidance.danger && (
              <p className="mt-2 text-sm font-medium text-destructive">
                This may be a dangerous situation — please contact Reception immediately.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              AI guidance is general information only. Do not take any action that may put you at
              risk.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setDescription("");
              setImageDataUrl("");
              setTranscription("");
              setInputMethod("text");
            }}
          >
            Report another issue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface-panel space-y-5 p-5 sm:p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hotel">{t("guest.hotel")}</Label>
          <Select
            value={hotelId}
            onValueChange={(v) => {
              setHotelId(v);
              setLocationId("");
            }}
          >
            <SelectTrigger id="hotel" disabled={isLoading}>
              <SelectValue placeholder={isLoading ? "Loading hotels…" : "Select hotel"} />
            </SelectTrigger>
            <SelectContent>
              {(directory?.hotels ?? []).map((hotel) => (
                <SelectItem key={hotel.id} value={hotel.id}>
                  {hotel.name}
                  {hotel.city ? ` — ${hotel.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">{t("guest.location")}</Label>
          <Select value={locationId} onValueChange={setLocationId} disabled={!hotelId}>
            <SelectTrigger id="location">
              <SelectValue placeholder={hotelId ? "Select room / area" : "Select a hotel first"} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!locationId && (
            <Input
              placeholder="Or type the location (e.g. Room 410, Gym)"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              maxLength={160}
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description">{t("guest.description")}</Label>
          {speechSupported ? (
            <Button
              type="button"
              size="sm"
              variant={listening ? "destructive" : "outline"}
              onClick={toggleVoice}
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {listening ? "Stop voice input" : "Voice input"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Voice input not supported here</span>
          )}
        </div>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (inputMethod === "text") setInputMethod("text");
          }}
          rows={compact ? 3 : 5}
          maxLength={2000}
          placeholder="e.g. The air conditioner in the room is not cooling and makes a loud noise."
          required
        />
        {listening && (
          <p className="text-xs text-primary">Listening… speak clearly, then stop the recording.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="photo">{t("guest.photo")}</Label>
          {imageDataUrl ? (
            <div className="relative w-fit">
              <img
                src={imageDataUrl}
                alt="Attached maintenance photo preview"
                className="h-28 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setImageDataUrl("")}
                className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                aria-label="Remove photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="photo"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:bg-muted"
            >
              <ImagePlus className="size-4" aria-hidden /> Take or upload a photo
              <input
                id="photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("guest.email")}</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={255}
          />
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="notify-updates"
              checked={notifyReporter}
              onCheckedChange={(checked) => setNotifyReporter(checked === true)}
              disabled={!email.trim()}
              className="mt-0.5"
            />
            <span>Email me updates when this request is assigned, updated and resolved.</span>
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Submitting…" : t("guest.submit")}
      </Button>
    </form>
  );
}
