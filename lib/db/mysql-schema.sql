-- ============================================================================
-- Kanak Turnkey Projects — Complete MySQL 8.0 Schema DDL (34 Tables)
-- Database: kanak_turnkey (Character Set: utf8mb4, Collation: utf8mb4_unicode_ci)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `kanak_turnkey`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `kanak_turnkey`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `avatar_url` TEXT,
  `roles` JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `active_role` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `password_hash` VARCHAR(255),
  `password_salt` VARCHAR(64),
  `phone` VARCHAR(64),
  `designation` VARCHAR(128),
  `department` VARCHAR(128),
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(128),
  `location` VARCHAR(255),
  `client_name` VARCHAR(255),
  `start_date` DATE,
  `end_date` DATE,
  `budget` DECIMAL(14, 2),
  `petty_cash_float` DECIMAL(14, 2) DEFAULT 50000.00,
  `description` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'planning',
  `progress` INT NOT NULL DEFAULT 0,
  `team_size` INT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_projects_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Leads Table
CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_number` VARCHAR(64) NOT NULL UNIQUE,
  `customer_name` VARCHAR(255) NOT NULL,
  `company` VARCHAR(255),
  `contact_email` VARCHAR(255),
  `contact_phone` VARCHAR(64),
  `project_type` VARCHAR(128),
  `location` VARCHAR(255),
  `budget_estimate` DECIMAL(14, 2),
  `lead_source` VARCHAR(128),
  `status` VARCHAR(32) NOT NULL DEFAULT 'new',
  `stage` VARCHAR(32) NOT NULL DEFAULT 'lead_creation',
  `priority` VARCHAR(16) NOT NULL DEFAULT 'medium',
  `owner_id` INT,
  `expected_closure_date` DATE,
  `won_project_id` INT,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_leads_status_stage` (`status`, `stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Lead Activities Table
CREATE TABLE IF NOT EXISTS `lead_activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `activity_type` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_lead_activities_lead_id` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Site Visits Table
CREATE TABLE IF NOT EXISTS `site_visits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `visit_date` DATE NOT NULL,
  `visit_time` VARCHAR(16),
  `engineer_id` INT,
  `site_address` TEXT,
  `latitude` DOUBLE,
  `longitude` DOUBLE,
  `measurements` TEXT,
  `observations` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_site_visits_lead_id` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Drawings Table
CREATE TABLE IF NOT EXISTS `drawings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(64),
  `file_size` INT,
  `file_url` TEXT,
  `version` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `reviewer_comments` TEXT,
  `uploaded_by_id` INT,
  `reviewed_by_id` INT,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_drawings_lead_id` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BOQs Table
CREATE TABLE IF NOT EXISTS `boqs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `tax_total` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `margin_total` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `created_by_id` INT,
  `approved_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_boqs_lead_id` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BOQ Items Table
CREATE TABLE IF NOT EXISTS `boq_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `boq_id` INT NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(128),
  `quantity` DECIMAL(14, 2) NOT NULL,
  `unit` VARCHAR(32),
  `unit_price` DECIMAL(14, 2) NOT NULL,
  `tax_percent` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `margin_percent` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `sort_order` INT NOT NULL DEFAULT 0,
  INDEX `idx_boq_items_boq_id` (`boq_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Negotiations Table
CREATE TABLE IF NOT EXISTS `negotiations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `round_number` INT NOT NULL DEFAULT 1,
  `revised_amount` DECIMAL(14, 2),
  `discount_percent` DECIMAL(6, 2),
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `requires_approval` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT,
  `created_by_id` INT,
  `approved_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_negotiations_lead_id` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `assigned_to_id` INT,
  `start_date` DATE,
  `end_date` DATE,
  `priority` VARCHAR(16) NOT NULL DEFAULT 'medium',
  `status` VARCHAR(32) NOT NULL DEFAULT 'todo',
  `progress` INT NOT NULL DEFAULT 0,
  `parent_task_id` INT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tasks_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Budget Items Table
CREATE TABLE IF NOT EXISTS `budget_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `cost_code` VARCHAR(64) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `budgeted` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `actual` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `committed` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  INDEX `idx_budget_items_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. RA Bills Table
CREATE TABLE IF NOT EXISTS `ra_bills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `bill_number` VARCHAR(64) NOT NULL,
  `description` TEXT,
  `amount` DECIMAL(14, 2) NOT NULL,
  `milestone` VARCHAR(255),
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `work_completion_percent` DECIMAL(5, 2),
  `verified_by_id` INT,
  `verified_at` DATETIME,
  `gross_amount` DECIMAL(14, 2),
  `retention_percent` DECIMAL(5, 2) DEFAULT 5.00,
  `retention_amount` DECIMAL(14, 2) DEFAULT 0.00,
  `advance_deduction` DECIMAL(14, 2) DEFAULT 0.00,
  `net_billable_amount` DECIMAL(14, 2),
  `supporting_docs_url` TEXT,
  `pm_approved_by_id` INT,
  `pm_approved_at` DATETIME,
  `revision_remarks` TEXT,
  `invoice_id` INT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ra_bills_project_id` (`project_id`),
  INDEX `idx_ra_bills_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Client Invoices Table
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `invoice_number` VARCHAR(64) NOT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `payment_date` DATE,
  `reconciled` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `ra_bill_id` INT,
  `gstin` VARCHAR(32),
  `tax_rate` DECIMAL(5, 2) DEFAULT 18.00,
  `tax_amount` DECIMAL(14, 2) DEFAULT 0.00,
  `total_with_tax` DECIMAL(14, 2),
  `sent_date` DATE,
  `payment_reminders_count` INT NOT NULL DEFAULT 0,
  `last_reminder_date` DATETIME,
  `reminder_notes` TEXT,
  `payment_reference` VARCHAR(128),
  `tds_amount` DECIMAL(14, 2) DEFAULT 0.00,
  `net_received_amount` DECIMAL(14, 2),
  `reconciled_at` DATETIME,
  `reconciled_by_id` INT,
  `closed_at` DATETIME,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_invoices_project_id` (`project_id`),
  INDEX `idx_invoices_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Vendors Table
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(64),
  `address` TEXT,
  `category` VARCHAR(128),
  `rating` DECIMAL(3, 1) NOT NULL DEFAULT 0.0,
  `status` VARCHAR(16) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Material Requests Table
CREATE TABLE IF NOT EXISTS `material_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `quantity` DECIMAL(14, 2) NOT NULL,
  `unit` VARCHAR(32) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `priority` VARCHAR(16) NOT NULL DEFAULT 'medium',
  `required_by_date` DATE,
  `rejection_reason` TEXT,
  `approved_by_id` INT,
  `approved_at` DATETIME,
  `site_stock_at_request` DECIMAL(14, 2),
  `warehouse_stock_at_request` DECIMAL(14, 2),
  `to_procure_quantity` DECIMAL(14, 2),
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_mat_requests_project_id` (`project_id`),
  INDEX `idx_mat_requests_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. RFQs Table
CREATE TABLE IF NOT EXISTS `rfqs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `material_request_id` INT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `deadline_date` DATE,
  `terms_and_conditions` TEXT,
  `invited_vendor_ids` TEXT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_rfqs_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Quotations Table
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rfq_id` INT NOT NULL,
  `vendor_id` INT NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `unit_price` DECIMAL(14, 2),
  `tax_amount` DECIMAL(14, 2),
  `freight_charges` DECIMAL(14, 2),
  `delivery_days` INT NOT NULL,
  `payment_terms` VARCHAR(128),
  `notes` TEXT,
  `is_selected` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_quotations_rfq_id` (`rfq_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Purchase Orders Table
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `vendor_id` INT NOT NULL,
  `po_number` VARCHAR(64) NOT NULL,
  `description` TEXT,
  `total_amount` DECIMAL(14, 2) NOT NULL,
  `delivery_date` DATE,
  `delivery_destination` VARCHAR(32) NOT NULL DEFAULT 'site',
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `inspection_status` VARCHAR(16) NOT NULL DEFAULT 'pending',
  `rfq_id` INT,
  `quotation_id` INT,
  `material_request_id` INT,
  `tracking_number` VARCHAR(128),
  `transporter_name` VARCHAR(255),
  `acknowledgment_date` DATE,
  `follow_up_count` INT NOT NULL DEFAULT 0,
  `last_follow_up_date` DATETIME,
  `follow_up_notes` TEXT,
  `inspected_by_id` INT,
  `inspected_at` DATETIME,
  `inspection_notes` TEXT,
  `grn_number` VARCHAR(64),
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_purchase_orders_project_id` (`project_id`),
  INDEX `idx_purchase_orders_vendor_id` (`vendor_id`),
  INDEX `idx_purchase_orders_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Vendor Invoices Table
CREATE TABLE IF NOT EXISTS `vendor_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `vendor_id` INT NOT NULL,
  `purchase_order_id` INT,
  `invoice_number` VARCHAR(64) NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `discrepancy_notes` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'received',
  `payment_date` DATE,
  `invoice_date` DATE,
  `due_date` DATE,
  `tax_amount` DECIMAL(14, 2),
  `po_amount` DECIMAL(14, 2),
  `grn_number` VARCHAR(64),
  `is_matched` TINYINT(1) NOT NULL DEFAULT 0,
  `matched_at` DATETIME,
  `discrepancy_type` VARCHAR(64),
  `resolution_notes` TEXT,
  `resolved_at` DATETIME,
  `scheduled_payment_date` DATE,
  `payment_reference` VARCHAR(128),
  `payment_mode` VARCHAR(32) DEFAULT 'neft',
  `paid_amount` DECIMAL(14, 2),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_vendor_invoices_project_id` (`project_id`),
  INDEX `idx_vendor_invoices_vendor_id` (`vendor_id`),
  INDEX `idx_vendor_invoices_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Materials Table
CREATE TABLE IF NOT EXISTS `materials` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `unit` VARCHAR(32) NOT NULL,
  `location_type` VARCHAR(32) NOT NULL DEFAULT 'site',
  `location_name` VARCHAR(128),
  `quantity_on_hand` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `quantity_committed` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `quantity_consumed` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `minimum_stock` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `reorder_level` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `unit_cost` DECIMAL(14, 2) DEFAULT 0.00,
  INDEX `idx_materials_project_id` (`project_id`),
  INDEX `idx_materials_location_type` (`location_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Stock Transfers Table
CREATE TABLE IF NOT EXISTS `stock_transfers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transfer_number` VARCHAR(64) NOT NULL UNIQUE,
  `material_name` VARCHAR(255) NOT NULL,
  `from_project_id` INT,
  `to_project_id` INT NOT NULL,
  `quantity` DECIMAL(14, 2) NOT NULL,
  `unit` VARCHAR(32) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `dispatch_date` DATETIME,
  `received_date` DATETIME,
  `notes` TEXT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_stock_transfers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Expenses Table
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `category` VARCHAR(32) NOT NULL,
  `expense_date` DATE NOT NULL,
  `receipt_url` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `payment_mode` VARCHAR(32) NOT NULL DEFAULT 'petty_cash',
  `vendor_or_shop_name` VARCHAR(255),
  `bill_reference_number` VARCHAR(64),
  `material_name` VARCHAR(255),
  `material_quantity` DECIMAL(14, 2),
  `material_unit` VARCHAR(32),
  `credited_to_inventory` TINYINT(1) NOT NULL DEFAULT 0,
  `submitted_by_id` INT,
  `approved_by_id` INT,
  `approved_at` DATETIME,
  `settled_at` DATETIME,
  `settlement_reference` VARCHAR(128),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_expenses_project_id` (`project_id`),
  INDEX `idx_expenses_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Financial Instruments Table
CREATE TABLE IF NOT EXISTS `financial_instruments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT,
  `instrument_type` VARCHAR(32) NOT NULL,
  `bg_sub_type` VARCHAR(32),
  `amount` DECIMAL(14, 2) NOT NULL,
  `issue_date` DATE,
  `expiry_date` DATE,
  `release_date` DATE,
  `bank_name` VARCHAR(255),
  `reference_number` VARCHAR(128),
  `retention_percent` DECIMAL(6, 2),
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `notes` TEXT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_fi_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Stakeholders Table
CREATE TABLE IF NOT EXISTS `stakeholders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `phone` VARCHAR(64),
  `organization` VARCHAR(255),
  `role` VARCHAR(128),
  `access_level` VARCHAR(16) NOT NULL DEFAULT 'read'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Communications Table
CREATE TABLE IF NOT EXISTS `communications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT,
  `stakeholder_id` INT,
  `communication_type` VARCHAR(16) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `content` TEXT,
  `communication_date` DATETIME NOT NULL,
  `participants` TEXT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Meetings Table
CREATE TABLE IF NOT EXISTS `meetings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `meeting_date` DATETIME NOT NULL,
  `duration` INT NOT NULL DEFAULT 60,
  `location` VARCHAR(255),
  `agenda` TEXT,
  `minutes` TEXT,
  `participants` TEXT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Documents Table
CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(64),
  `file_size` INT,
  `file_url` TEXT,
  `category` VARCHAR(32) NOT NULL DEFAULT 'general',
  `version` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(16) NOT NULL DEFAULT 'active',
  `uploaded_by_id` INT,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `notification_type` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `activity` VARCHAR(255) NOT NULL,
  `resource_type` VARCHAR(64) NOT NULL,
  `resource_id` INT,
  `ip_address` VARCHAR(64),
  `status` VARCHAR(32) NOT NULL DEFAULT 'success',
  `metadata` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 30. Task Templates Table
CREATE TABLE IF NOT EXISTS `task_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `project_type` VARCHAR(128),
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 31. Task Template Items Table
CREATE TABLE IF NOT EXISTS `task_template_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `phase` VARCHAR(128),
  `priority` VARCHAR(16) NOT NULL DEFAULT 'medium',
  `estimated_days` INT,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 32. Punch List Items Table
CREATE TABLE IF NOT EXISTS `punch_list_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `category` VARCHAR(64) NOT NULL DEFAULT 'general',
  `priority` VARCHAR(16) NOT NULL DEFAULT 'medium',
  `status` VARCHAR(32) NOT NULL DEFAULT 'open',
  `assigned_to_id` INT,
  `due_date` DATE,
  `resolved_at` DATETIME,
  `resolved_by_id` INT,
  `created_by_id` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 33. Roles Table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(64) NOT NULL UNIQUE,
  `name` VARCHAR(128) NOT NULL,
  `description` TEXT,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `permissions` JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 34. Company Settings Table
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(255) NOT NULL DEFAULT 'Kanak Turnkey Solutions Pvt. Ltd.',
  `legal_entity_type` VARCHAR(128) DEFAULT 'Private Limited',
  `gstin` VARCHAR(32) DEFAULT '27AABCK1234F1Z5',
  `pan` VARCHAR(32) DEFAULT 'AABCK1234F',
  `cin` VARCHAR(64) DEFAULT 'U45200MH2021PTC123456',
  `email` VARCHAR(255) DEFAULT 'contact@kanakturnkey.com',
  `phone` VARCHAR(64) DEFAULT '+91 98765 43210',
  `website` VARCHAR(255) DEFAULT 'https://kanakturnkey.com',
  `address` TEXT DEFAULT ('Tower 4, Level 8, Tech Park, Powai'),
  `city` VARCHAR(128) DEFAULT 'Mumbai',
  `state` VARCHAR(128) DEFAULT 'Maharashtra',
  `pincode` VARCHAR(32) DEFAULT '400076',
  `country` VARCHAR(128) DEFAULT 'India',
  `bank_name` VARCHAR(128) DEFAULT 'HDFC Bank',
  `bank_account_name` VARCHAR(255) DEFAULT 'Kanak Turnkey Solutions Pvt Ltd',
  `bank_account_number` VARCHAR(64) DEFAULT '50200012345678',
  `bank_ifsc` VARCHAR(32) DEFAULT 'HDFC0000123',
  `bank_branch` VARCHAR(128) DEFAULT 'Powai Branch, Mumbai',
  `currency` VARCHAR(16) DEFAULT 'INR',
  `currency_symbol` VARCHAR(8) DEFAULT '₹',
  `logo_url` TEXT,
  `terms_and_conditions` TEXT DEFAULT ('Payment due within 30 days of invoice date. 18% p.a. interest applicable on overdue bills.'),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
