let
    F = Table.Buffer(FactSnapshot),
    Duplicates = Table.RowCount(F)-List.Count(List.Distinct(F[booking_id])),
    MissingIds = List.Count(List.Select(F[booking_id],each _=null or _="")),
    Orphans = (factColumn as text, dimension as table, key as text) as number => List.Count(List.Difference(List.Distinct(Table.Column(F,factColumn)),Table.Column(dimension,key))),
    Result = #table(type table [check=text, issue_count=Int64.Type],{{"duplicate_booking_id",Duplicates},{"missing_booking_id",MissingIds},{"hotel_fk",Orphans("hotel_key",DimHotel,"hotel_key")},{"room_fk",Orphans("room_key",DimRoom,"room_key")},{"country_fk",Orphans("country_key",DimCountry,"country_key")},{"customer_type_fk",Orphans("customer_type_key",DimCustomerType,"customer_type_key")},{"date_fk_nonnull",List.Count(List.Difference(List.RemoveNulls(List.Distinct(F[arrival_date])),DimDate[date_key]))},{"invalid_arrival_date",List.Count(List.Select(F[arrival_date],each _=null))}})
in Result
