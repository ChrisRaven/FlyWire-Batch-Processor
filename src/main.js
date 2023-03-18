include "header.js"

include "attach_dock.js"
include "constants.js"

include "json-bigint.js"

include "pickr.js"
include "connectivity.js"


include "actions_menu.js"

include "actions/hide.js"
include "actions/show.js"
include "actions/open_in_new_tab.js"
include "actions/remove.js"
include "actions/copy.js"
include "actions/change_color.js"
include "actions/find_common.js"
include "actions/neuropils_coverage.js"
include "actions/show_statuses_and_labels.js"

function main() {
  addPickr()
  addActionsMenu()
}
