export default {
  routes: [
    {
      method: "POST",
      path: "/lessons/:id/lock",
      handler: "custom-lesson.acquireLock",
    },
    {
      method: "DELETE",
      path: "/lessons/:id/lock",
      handler: "custom-lesson.releaseLock",
    },
    {
      method: "PUT",
      path: "/lessons/:id/lock/heartbeat",
      handler: "custom-lesson.heartbeat",
    },
    {
      method: "GET",
      path: "/lessons/:id/lock-status",
      handler: "custom-lesson.getLockStatus",
    },
  ],
};
