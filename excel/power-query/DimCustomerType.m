let
    Result = Table.Distinct(Table.SelectColumns(FactSnapshot,{"customer_type_key"}))
in Result
