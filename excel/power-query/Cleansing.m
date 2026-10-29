let
    NumericFields = {"is_canceled","lead_time","arrival_date_year","arrival_date_week_number","arrival_date_day_of_month","stays_in_weekend_nights","stays_in_week_nights","adults","children","babies","is_repeated_guest","previous_cancellations","previous_bookings_not_canceled","booking_changes","agent","company","days_in_waiting_list","adr","required_car_parking_spaces","total_of_special_requests"},
    RequiredNumbers = {"is_canceled","lead_time","arrival_date_year","arrival_date_day_of_month","stays_in_weekend_nights","stays_in_week_nights","adults","babies","adr"},
    NonnegativeFields = {"lead_time","stays_in_weekend_nights","stays_in_week_nights","adults","children","babies","previous_cancellations","previous_bookings_not_canceled","booking_changes","days_in_waiting_list","required_car_parking_spaces","total_of_special_requests"},
    IntegerFields = List.RemoveItems(NumericFields,{"adr"}),
    Months = {"January","February","March","April","May","June","July","August","September","October","November","December"},
    Threshold = Number.From(Excel.CurrentWorkbook(){[Name="cfgAdrReviewThreshold"]}[Content]{0}[Column1]),
    IsMissing = (v as any) as logical => v=null or (Value.Is(v,type text) and List.Contains({"","NULL","NA","N/A"},Text.Upper(Text.Trim(v)))),
    NumberOrNull = (v as any) as nullable number => if IsMissing(v) then null else try Number.From(v,"en-US") otherwise null,
    CleanRecord = (r as record) as record =>
        let
            Missing = List.Select(if Record.FieldOrDefault(r,"data_source")="original" then List.RemoveItems(Record.FieldNames(r),{"created_at"}) else Record.FieldNames(r),(k)=>IsMissing(Record.Field(r,k))),
            ConversionInvalid = List.Select(NumericFields,(k)=>not IsMissing(Record.FieldOrDefault(r,k)) and NumberOrNull(Record.FieldOrDefault(r,k))=null),
            Nums = Record.FromList(List.Transform(NumericFields,(k)=>NumberOrNull(Record.FieldOrDefault(r,k))),NumericFields),
            TextKeys = List.Difference(Record.FieldNames(r),NumericFields),
            Texts = Record.FromList(List.Transform(TextKeys,(k)=>let v=Record.Field(r,k) in if IsMissing(v) then null else Text.Trim(Text.From(v,"en-US"))),TextKeys),
            Base = Record.Combine({Texts,Nums}),
            MonthNumber = List.PositionOf(Months,Record.FieldOrDefault(Base,"arrival_date_month"))+1,
            Arrival = try #date(Base[arrival_date_year],MonthNumber,Base[arrival_date_day_of_month]) otherwise null,
            StatusDate = if IsMissing(Record.FieldOrDefault(r,"reservation_status_date")) then null else try Date.FromText(Text.From(r[reservation_status_date]),[Format="yyyy-MM-dd",Culture="en-US"]) otherwise null,
            Negative = List.Select(NonnegativeFields,(k)=>let v=Record.Field(Nums,k) in v<>null and v<0),
            NonInteger = List.Select(IntegerFields,(k)=>let v=Record.Field(Nums,k) in v<>null and Number.RoundDown(v)<>v),
            Invalid = List.Combine({ConversionInvalid,List.Transform(Negative,each _&":negative"),List.Transform(NonInteger,each _&":noninteger"),if Arrival=null then {"arrival_date"} else {},if not IsMissing(Record.FieldOrDefault(r,"reservation_status_date")) and StatusDate=null then {"reservation_status_date"} else {},if not List.Contains({0,1},Base[is_canceled]) then {"is_canceled:binary"} else {},if not List.Contains({"Check-Out","Canceled","No-Show"},Record.FieldOrDefault(Base,"reservation_status")) then {"reservation_status:category"} else {},if Base[adr]<>null and Base[adr]<0 then {"adr:negative"} else {},if (Base[reservation_status]="Check-Out" and Base[is_canceled]<>0) or (List.Contains({"Canceled","No-Show"},Base[reservation_status]) and Base[is_canceled]<>1) then {"status_mismatch"} else {}}),
            NightsValid = Base[stays_in_week_nights]<>null and Base[stays_in_weekend_nights]<>null and Base[stays_in_week_nights]>=0 and Base[stays_in_weekend_nights]>=0 and not List.Contains(NonInteger,"stays_in_week_nights") and not List.Contains(NonInteger,"stays_in_weekend_nights"),
            Nights = if NightsValid then Base[stays_in_week_nights]+Base[stays_in_weekend_nights] else null,
            AdrValid = Base[adr]<>null and Base[adr]>=0,
            HotelKey = if Base[hotel]=null then "__MISSING__" else Base[hotel],
            RoomKey = HotelKey & "|" & (if Base[reserved_room_type]=null then "__MISSING__" else Base[reserved_room_type]),
            Revenue = if Base[reservation_status]="Check-Out" and NightsValid and AdrValid then Base[adr]*Nights else null,
            Derived = [arrival_date=Arrival,reservation_status_date_typed=StatusDate,month_start=if Arrival=null then null else Date.StartOfMonth(Arrival),inferred_booking_date=if Arrival<>null and Base[lead_time]<>null and Base[lead_time]>=0 and not List.Contains(NonInteger,"lead_time") then Date.AddDays(Arrival,-Base[lead_time]) else null,total_nights=Nights,hotel_key=HotelKey,room_key=RoomKey,country_key=if Base[country]=null then "__MISSING__" else Base[country],customer_type_key=if Base[customer_type]=null then "__MISSING__" else Base[customer_type],children_missing=List.Contains(Missing,"children"),missing_fields=Text.Combine(Missing,", "),analysis_missing_fields=Text.Combine(List.Intersect({Missing,List.Combine({RequiredNumbers,{"children","country","hotel","reserved_room_type","customer_type","distribution_channel","market_segment","reservation_status"}})}),", "),required_missing_fields=Text.Combine(List.Intersect({Missing,RequiredNumbers}),", "),invalid_fields=Text.Combine(Invalid,", "),outlier_flags=if AdrValid and Base[adr]>Threshold then "adr_above_review_threshold" else "",adr_valid=AdrValid,nights_valid=NightsValid,estimated_lodging_revenue=Revenue]
        in Record.Combine({Base,Derived}),
    Records = List.Transform(Table.ToRecords(Source),CleanRecord),
    Clean = Table.FromRecords(Records),
    Typed = Table.TransformColumnTypes(Clean,List.Combine({List.Transform(NumericFields,each {_,type number}),{{"arrival_date",type date},{"reservation_status_date_typed",type date},{"month_start",type date},{"inferred_booking_date",type date},{"total_nights",type number},{"estimated_lodging_revenue",type number},{"children_missing",type logical},{"adr_valid",type logical},{"nights_valid",type logical}}}))
in
    Typed
