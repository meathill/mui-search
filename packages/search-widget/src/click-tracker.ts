import { normalizeApiBaseUrl } from "./search-api";
import type { TrackClickParams } from "./types";

type BeaconSender = (url: string, data?: BodyInit | null) => boolean;

interface SubmitClickTrackingOptions {
  apiBaseUrl: string;
  payload: TrackClickParams;
  sendBeacon?: BeaconSender;
  fetchImpl?: typeof fetch;
}

export function submitClickTrackingByBeacon(options: SubmitClickTrackingOptions): void {
  const endpoint = `${normalizeApiBaseUrl(options.apiBaseUrl)}/api/click`;
  const body = buildClickRequestBody(options.payload);
  const sendBeacon = options.sendBeacon ?? resolveBeaconSender();

  if (sendBeacon) {
    const queued = tryQueueBeacon(sendBeacon, endpoint, body);
    if (queued) {
      return;
    }
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  void fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(function ignoreTrackingFailure() {
    return;
  });
}

function buildClickRequestBody(payload: TrackClickParams): TrackClickParams {
  const body: TrackClickParams = {
    query: payload.query,
    contentId: payload.contentId,
    contentTitle: payload.contentTitle,
  };

  const locale = payload.locale?.trim();
  if (locale) {
    body.locale = locale;
  }

  const contentLocale = payload.contentLocale?.trim();
  if (contentLocale) {
    body.contentLocale = contentLocale;
  }

  return body;
}

function resolveBeaconSender(): BeaconSender | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  if (typeof navigator.sendBeacon !== "function") {
    return undefined;
  }

  return navigator.sendBeacon.bind(navigator);
}

function tryQueueBeacon(sendBeacon: BeaconSender, endpoint: string, body: TrackClickParams): boolean {
  try {
    const payload = new Blob([JSON.stringify(body)], {
      type: "application/json; charset=utf-8",
    });
    return sendBeacon(endpoint, payload);
  } catch {
    return false;
  }
}
