let
    Result = Table.Distinct(Table.SelectColumns(FactSnapshot,{"country_key"}))
in Result
