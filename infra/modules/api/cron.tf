# docs/Payments-and-Subscription-Plan.md — daily subscription lifecycle check (trial
# expiry, past-due transitions, 14-day auto-revert-to-Free). Invokes the SAME Lambda
# function as the API (aws_lambda_function.api, declared in main.tf) via a synthetic
# EventBridge event — not a second function, avoiding a whole new deploy pipeline.
# api/src/index.ts's `event.source === 'lynxboxph.scheduler'` branch is what reads the
# `input` below; it runs before any path/httpMethod-based dispatch.

resource "aws_cloudwatch_event_rule" "daily_subscription_check" {
  name                = "${var.project_name}-daily-subscription-check-${var.environment}"
  description         = "Daily trial/past-due subscription lifecycle check"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "daily_subscription_check" {
  rule = aws_cloudwatch_event_rule.daily_subscription_check.name
  arn  = aws_lambda_function.api.arn

  input = jsonencode({
    source        = "lynxboxph.scheduler"
    detail-type   = "daily-subscription-check"
  })
}

resource "aws_lambda_permission" "allow_eventbridge_subscription_check" {
  statement_id  = "AllowExecutionFromEventBridgeSubscriptionCheck"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_subscription_check.arn
}
