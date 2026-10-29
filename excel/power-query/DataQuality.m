let
    Issues = Table.SelectRows(FactSnapshot, each [analysis_missing_fields]<>"" or [invalid_fields]<>"" or [outlier_flags]<>""),
    Result = Table.SelectColumns(Issues,{"booking_id","data_source","hotel","arrival_date","children_missing","analysis_missing_fields","missing_fields","required_missing_fields","invalid_fields","outlier_flags","adr_valid","nights_valid"})
in
    Result
