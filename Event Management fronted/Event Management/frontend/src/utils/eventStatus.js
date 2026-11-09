export const getEventStatus = (date) => {
  if (!date) {
    return { label: "Pending", completed: false };
  }

  const dateText = typeof date === "string" ? date : "";
  const dateParts = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const eventDate = dateParts
    ? new Date(
        Number(dateParts[1]),
        Number(dateParts[2]) - 1,
        Number(dateParts[3])
      )
    : new Date(date);

  if (Number.isNaN(eventDate.getTime())) {
    return { label: "Pending", completed: false };
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const eventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate()
  );
  const completed = eventDay < todayStart;

  return {
    label: completed ? "Completed" : "Pending",
    completed,
  };
};
