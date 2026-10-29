let
    // Read the completed native FactBookings query table, not the raw source again.
    // Scripts refresh FactBookings synchronously FIRST, then refresh dependents.
    Loaded = Excel.CurrentWorkbook(){[Name="tblFactBookings"]}[Content],
    Typed = Table.TransformColumnTypes(Loaded,{{"arrival_date",type date},{"reservation_status_date_typed",type date},{"month_start",type date},{"inferred_booking_date",type date},{"children_missing",type logical},{"adr_valid",type logical},{"nights_valid",type logical},{"total_nights",type number},{"adr",type number},{"is_canceled",type number},{"estimated_lodging_revenue",type number}})
in Typed
