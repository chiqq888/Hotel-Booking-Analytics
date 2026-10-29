let
    Result = Table.Distinct(Table.SelectColumns(FactSnapshot,{"room_key","hotel_key","reserved_room_type"}))
in Result
