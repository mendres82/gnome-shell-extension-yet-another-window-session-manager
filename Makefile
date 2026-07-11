# Translation workflow (requires gettext-tools).
#
# Typical release flow:
#   make update-template   # after changing _() strings in code
#   make sync-po           # merge new strings into po/*.po
#   edit po/de.po
#   make compile-locales   # then include locale/ in your zip

.PHONY: help update-template sync-po compile-locales i18n

help:
	@echo "Translation targets:"
	@echo "  make update-template   Regenerate po/*.pot from JS/UI sources"
	@echo "  make sync-po           Merge template into po/*.po"
	@echo "  make compile-locales   Compile po/*.po to locale/*/LC_MESSAGES/*.mo"
	@echo "  make i18n              update-template + sync-po (edit po/*.po, then compile-locales)"

update-template:
	./build/update-template.sh

sync-po:
	./build/sync-po.sh

compile-locales:
	./build/compile-locales.sh

i18n: update-template sync-po
	@echo "Edit po/*.po, then run: make compile-locales"
