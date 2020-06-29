export function isAction(action) {
    return action == "advance" || action == "replace" || action == "restore";
}
