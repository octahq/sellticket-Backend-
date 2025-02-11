import * as cron from "node-cron";
import { QueueService } from "../queue/queue.service";
import { AppDataSource } from "../../config/db.config";
import { Event } from "./entities/event.entity";
import { QUEUE_NAMES } from "../queue/queue.constants";

/**
 * Function to schedule the cleanup of expired draft events.
 * Runs a cron job every midnight to add expired drafts to the queue.
 * @param queueService - QueueService instance to enqueue jobs
 */
export function scheduleDraftCleanup(queueService: QueueService) {
  cron.schedule("0 0 * * *", async () => {
    console.log("⏳ Running draft event cleanup job...");

    try {
      const eventRepository = AppDataSource.getRepository(Event);

      const expiredDrafts = await eventRepository
        .createQueryBuilder("event")
        .where("event.isDraft = true")
        .andWhere("event.createdAt < NOW() - INTERVAL '3 days'") 
        .select(["event.id"])
        .getMany();

      if (expiredDrafts.length === 0) {
        console.log("✅ No expired draft events found.");
        return;
      }

      // ✅ Bulk enqueue all jobs at once using `addBulk`
      await queueService.addBulk(QUEUE_NAMES.EVENT_CLEANUP, expiredDrafts.map((event) => ({
        name: "deleteEvent",
        data: { eventId: event.id },
      })));

      console.log(`✅ Scheduled ${expiredDrafts.length} draft events for deletion.`);
    } catch (error) {
      console.error("❌ Error running draft cleanup job:", error);
    }
  });
}
