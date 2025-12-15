#!/usr/bin/env bash
set -euo pipefail

# Limpia compilaciones antiguas de Cloud Build dejando sólo las más recientes.
# Requiere el SDK de gcloud autenticado con permisos de Build Admin.

PROJECT_ID="${PROJECT_ID:-contacto-estudiantil}"
REGION="${CLOUD_BUILD_REGION:-us-east4}"
KEEP="${KEEP_BUILDS:-2}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud no está instalado. Instálalo antes de continuar." >&2
  exit 1
fi

# Obtiene IDs ordenados de más reciente a más antiguo.
mapfile -t build_ids < <(gcloud builds list \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(ID)" \
  --sort-by="~createTime")

if (( ${#build_ids[@]} == 0 )); then
  echo "No hay compilaciones en ${PROJECT_ID}/${REGION}."
  exit 0
fi

if (( KEEP < 0 )); then
  echo "KEEP_BUILDS debe ser 0 o mayor." >&2
  exit 1
fi

if (( ${#build_ids[@]} <= KEEP )); then
  echo "Solo hay ${#build_ids[@]} compilaciones; no se elimina ninguna."
  exit 0
fi

# Deja las primeras KEEP compilaciones (más recientes) y elimina el resto.
old_builds=("${build_ids[@]:KEEP}")

printf 'Se eliminarán %d compilaciones antiguas en %s/%s:\n' "${#old_builds[@]}" "$PROJECT_ID" "$REGION"
printf ' - %s\n' "${old_builds[@]}"

gcloud builds delete "${old_builds[@]}" --project="$PROJECT_ID" --region="$REGION" --quiet

echo "Limpieza completada."
