export const getEventShareUrl = (eventId) => {
  const url = new URL("/events", window.location.origin);
  url.searchParams.set("eventId", eventId);
  return url.toString();
};

export const shareEvent = async (event) => {
  const url = getEventShareUrl(event._id);
  const details = {
    title: event.title,
    text: [event.title, event.location, event.date ? new Date(event.date).toLocaleDateString() : ""]
      .filter(Boolean)
      .join(" · "),
    url,
  };

  if (typeof navigator.share === "function") {
    try {
      await navigator.share(details);
      return "shared";
    } catch (error) {
      if (error.name === "AbortError") return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    window.prompt("Copy this event link to share:", url);
    return "prompted";
  }
};
