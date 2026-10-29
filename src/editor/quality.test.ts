import { describe, expect, it } from "vitest";
import { qualityFor } from "./quality";

const CHROME_PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("calidad del 3D según el aparato", () => {
  it("un PC normal va con calidad alta (6 luces, 60 fps)", () => {
    const q = qualityFor({ ua: CHROME_PC, cores: 8, memory: 8 });
    expect(q).toMatchObject({ level: "alta", lights: 6, fps: 60 });
  });

  it("un PC modesto o un móvil, media", () => {
    expect(qualityFor({ ua: CHROME_PC, cores: 4 }).level).toBe("media");
    expect(qualityFor({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }).level).toBe("media");
  });

  it("las Smart TV, calidad baja (2 luces, 30 fps)", () => {
    for (const ua of [
      "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146/6.0 TV Safari/537.36",
      "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0 Safari/537.36 WebAppManager",
      "Mozilla/5.0 (Linux; Android 9; BRAVIA 4K GB Build/PTT1) AppleWebKit/537.36 Chrome/96.0 Safari/537.36",
      "Mozilla/5.0 (Linux; Android 10; AFTMM Build/PS7233) AppleWebKit/537.36 Chrome/88.0 Safari/537.36",
    ]) {
      const q = qualityFor({ ua, cores: 8 });
      expect(q).toMatchObject({ level: "baja", lights: 2, fps: 30 });
    }
  });

  it("?calidad fuerza el nivel", () => {
    expect(qualityFor({ ua: CHROME_PC, search: "?calidad=baja", cores: 16 }).level).toBe("baja");
    expect(qualityFor({ ua: "SMART-TV", search: "?calidad=alta" }).level).toBe("alta");
    expect(qualityFor({ ua: CHROME_PC, search: "?calidad=rara", cores: 8 }).level).toBe("alta");
  });
});
