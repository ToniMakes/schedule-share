export async function readJson(
  request: Request
): Promise<{ readonly success: true; readonly value: unknown } | { readonly success: false }> {
  try {
    return {
      success: true,
      value: await request.json()
    };
  } catch {
    return {
      success: false
    };
  }
}
