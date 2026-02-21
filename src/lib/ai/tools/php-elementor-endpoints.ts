/**
 * PHP route registrations for Elementor read/write endpoints.
 * Returns the PHP code to be placed inside add_action('rest_api_init', ...).
 */

/** Route registrations for Elementor widget read/write */
export function getElementorEndpoints(): string {
  return `
    // GET — Read all widgets from a page (flat list)
    register_rest_route( 'wp-pilot/v1', '/elementor/(?P<post_id>\\\\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'wppilot_get_elementor_data',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args' => array(
            'post_id' => array( 'required' => true, 'type' => 'integer' ),
        ),
    ) );

    // POST — Update a specific widget's settings
    register_rest_route( 'wp-pilot/v1', '/elementor/(?P<post_id>\\\\d+)/widget/(?P<widget_id>[a-z0-9]+)', array(
        'methods'             => 'POST',
        'callback'            => 'wppilot_update_elementor_widget',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args' => array(
            'post_id'   => array( 'required' => true, 'type' => 'integer' ),
            'widget_id' => array( 'required' => true, 'type' => 'string' ),
        ),
    ) );
`;
}
