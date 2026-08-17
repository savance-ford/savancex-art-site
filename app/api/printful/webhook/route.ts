export function POST(): Response {
  return new Response("Not Implemented", {
    status: 501,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
