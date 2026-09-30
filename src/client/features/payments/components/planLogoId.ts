// The shared-layout id that lets a plan's logo move from its home card to the payment screen.
// One element per id per screen: history rows and other lists never use it.
export const planLogoId = (planCode: string) => `plan-logo-${planCode}`;
