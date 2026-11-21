// Integrated speed profile: a short pickup, native cruise, then a long braking tail.
// In the tail the speed is proportional to v³(4 − 3v), with v falling to zero.
const pickup = .18, brakeAt = .34, tail = 1 - brakeAt;
const distance = pickup / 2 + (brakeAt - pickup) + .4 * tail;

export function captureArrival(progress) {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    if (progress < pickup) {
        const u = progress / pickup;
        return pickup * u ** 3 * (1 - .5 * u) / distance;
    }
    if (progress < brakeAt) return (progress - pickup / 2) / distance;
    const remaining = (1 - progress) / tail;
    return 1 - tail * remaining ** 4 * (1 - .6 * remaining) / distance;
}
