// Contact downloads and links count; passive views and form submissions do not.
export const connectionActionSQL =
  "kind='action' AND (target IN ('contact','whatsapp','directions','email','phone','website') OR target GLOB 'link:[0-9]*' OR target GLOB 'service:[0-5]')";
