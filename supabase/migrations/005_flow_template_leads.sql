-- Add flow_template_id to leads for accurate A/B testing metrics
ALTER TABLE leads
ADD COLUMN flow_template_id UUID REFERENCES flow_templates(id) ON DELETE SET NULL;
