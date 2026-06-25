$body = @{
    object = "page"
    entry = @(
        @{
            id = "240543465799764"
            time = 1234567890
            changes = @(
                @{
                    value = @{
                        from = @{
                            id = "999999999"
                            name = "Cliente Simulado"
                        }
                        item = "comment"
                        post_id = "240543465799764_111111"
                        comment_id = "240543465799764_222222"
                        verb = "add"
                        created_time = 1234567890
                        message = "Hola, me interesa este producto (Simulado)"
                    }
                    field = "feed"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://chatify-teal-xi.vercel.app/api/meta-webhook" -Method Post -Body $body -ContentType "application/json"
