import { env } from "../config.js";
import type { DeviceRecord } from "../devices/types.js";

type OptimaDevice = DeviceRecord<string | null>;

export class OptimaApiClient {
  private readonly baseUrl = new URL(
    env.OPTIMA_API_BASE_URL.endsWith("/") ? env.OPTIMA_API_BASE_URL : `${env.OPTIMA_API_BASE_URL}/`,
  );

  async fetchDevices(): Promise<OptimaDevice[]> {
    const url = new URL("devices", this.baseUrl);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.OPTIMA_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Optima API request failed with ${response.status} ${response.statusText}`);
    }

    // TODO: Validate the upstream API payload before casting it into our local type.
    return (await response.json()) as OptimaDevice[];
  }
}
