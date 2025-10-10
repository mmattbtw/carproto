import "@typelex/emitter";

namespace net.mmatt.vitals.car {
  @rec("tid")
  model Main {
    /** The unix timestamp of when the vital was recorded */
    @required
    createdAt: datetime;
    /** The car fuel range value in miles */
    @required
    carFuelRange: integer;
    /** The car fuel level value in percentage */
    @required
    carPercentFuelRemaining: integer;
    /** The car fuel amount remaining value */
    @required
    amountRemaining: integer;
    /** The car traveled distance value */
    @required
    carTraveledDistance: integer;

    /** The car make value */
    carMake?: string;
    /** The car model value */
    carModel?: string;
    /** The car year value */
    carYear?: integer;
  }
}