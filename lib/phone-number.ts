// A manual international option preserves numbers from any calling region.
export const phoneRegions =
  'MZ:258 ZA:27 PT:351 BR:55 AO:244 CV:238 GW:245 ST:239 TL:670 TW:886 CN:86 HK:852 MO:853 GB:44 US:1 CA:1 UA:380 PL:48 FR:33 DE:49 ES:34 IT:39 NL:31 BE:32 CH:41 AT:43 SE:46 NO:47 DK:45 FI:358 IE:353 CZ:420 RO:40 GR:30 TR:90 RU:7 IN:91 PK:92 BD:880 JP:81 KR:82 SG:65 MY:60 ID:62 PH:63 TH:66 VN:84 AU:61 NZ:64 AE:971 SA:966 IL:972 EG:20 MA:212 NG:234 GH:233 KE:254 TZ:255 UG:256 ZM:260 ZW:263 MW:265 BW:267 NA:264 SZ:268 LS:266 MG:261 MU:230 RW:250 ET:251 SN:221 CI:225 CD:243 CM:237 AR:54 CL:56 CO:57 MX:52 PE:51'
    .split(' ')
    .map((item) => {
      const [region, code] = item.split(':');
      return { region, code: '+' + code };
    });
export const countryFlag = (region: string) =>
  region
    .split('')
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('');

export function splitPhoneNumber(current: string, chosen = 'MZ') {
  const match = [...phoneRegions]
    .sort((a, b) => b.code.length - a.code.length)
    .find((item) => current.startsWith(item.code));
  const selected = current.startsWith('+')
    ? (phoneRegions.find(
        (item) => item.region === chosen && current.startsWith(item.code),
      ) ?? match)
    : phoneRegions.find((item) => item.region === chosen);
  return {
    region:
      current.startsWith('+') && !match
        ? 'other'
        : (selected?.region ?? 'other'),
    code: selected?.code ?? '',
    number:
      selected && current.startsWith(selected.code)
        ? current.slice(selected.code.length).trimStart()
        : current,
  };
}
export function joinPhoneNumber(number: string, code: string) {
  return number
    ? number.startsWith('+')
      ? number
      : (code || '+') + number
    : '';
}
