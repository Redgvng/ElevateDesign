import { eveChannel } from "eve/channels/eve";
import { placeholderAuth } from "eve/channels/auth";

/**
 * Default eve HTTP channel. `placeholderAuth` accepts local development
 * requests and blocks in production until an explicit product-auth integration
 * is wired — the backend, not Eve, owns user authentication.
 */
export default eveChannel({
  auth: [placeholderAuth()],
});
