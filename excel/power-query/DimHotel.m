let
    Result = Table.Distinct(Table.SelectColumns(FactSnapshot,{"hotel_key"}))
in Result
