-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "customer_number" TEXT NOT NULL,
    "reference_month" TEXT NOT NULL,
    "electrical_energy_quantity" DOUBLE PRECISION NOT NULL,
    "electrical_energy_value" DOUBLE PRECISION NOT NULL,
    "sceee_energy_without_icms_quantity" DOUBLE PRECISION NOT NULL,
    "sceee_energy_without_icms_value" DOUBLE PRECISION NOT NULL,
    "gdi_compensated_energy_quantity" DOUBLE PRECISION NOT NULL,
    "gdi_compensated_energy_value" DOUBLE PRECISION NOT NULL,
    "contrib_municipal_public_light_value" DOUBLE PRECISION NOT NULL,
    "electrical_energy_consumption_value" DOUBLE PRECISION NOT NULL,
    "total_value_without_gd" DOUBLE PRECISION NOT NULL,
    "gd_economy" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_customer_number_reference_month_key" ON "invoices"("customer_number", "reference_month");
