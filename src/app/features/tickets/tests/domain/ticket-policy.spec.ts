import { CustomerAccountPolicy, KitchenOrderPolicy } from '../../domain/policies/ticket.policy';

describe('TicketPolicy (Domain Rules)', () => {
  it('CustomerAccountPolicy should enforce commercial customer rules', () => {
    expect(CustomerAccountPolicy.includeBranding).toBeTrue();
    expect(CustomerAccountPolicy.includePrices).toBeTrue();
    expect(CustomerAccountPolicy.includeTotals).toBeTrue();
    expect(CustomerAccountPolicy.includeFooter).toBeTrue();
    expect(CustomerAccountPolicy.isKitchenBadge).toBeFalse();
  });

  it('KitchenOrderPolicy should enforce kitchen production rules', () => {
    expect(KitchenOrderPolicy.includeBranding).toBeFalse();
    expect(KitchenOrderPolicy.includePrices).toBeFalse();
    expect(KitchenOrderPolicy.includeTotals).toBeFalse();
    expect(KitchenOrderPolicy.includeFooter).toBeFalse();
    expect(KitchenOrderPolicy.isKitchenBadge).toBeTrue();
  });

  it('Policies should be immutable frozen objects', () => {
    expect(Object.isFrozen(CustomerAccountPolicy)).toBeTrue();
    expect(Object.isFrozen(KitchenOrderPolicy)).toBeTrue();
  });
});
