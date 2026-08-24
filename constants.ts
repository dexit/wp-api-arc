import { ProjectState } from './types';

export const DEFAULT_SUPPORTS_OPTIONS = [
  'title',
  'editor',
  'author',
  'thumbnail',
  'excerpt',
  'trackbacks',
  'custom-fields',
  'comments',
  'revisions',
  'page-attributes',
  'post-formats',
];

export const INITIAL_PROJECT_STATE: ProjectState = {
  name: 'Corporate HQ Portal',
  namespace: 'corporate',
  apiVersion: 'v1',
  globalHelpers: [
    {
      id: 'helper_1',
      name: 'send_audit_log',
      parameters: '$action_name, $user_id',
      description: 'Logs sensitive actions to an external file',
      phpCode: `error_log( "Audit: " . $action_name . " by User " . $user_id );`
    }
  ],
  postTypes: [
    {
      id: 'testimonial_1',
      slug: 'testimonial',
      singularName: 'Testimonial',
      pluralName: 'Testimonials',
      description: 'Customer success stories and quotes',
      icon: 'format-quote',
      supports: ['title', 'editor', 'thumbnail'],
      taxonomies: [],
      showInRest: true,
      restBase: 'testimonials',
      metaFields: [
        { id: 't_1', key: 'client_name', label: 'Client Name', type: 'string' as any, description: 'Full name of the client', required: true, showInRest: true },
        { id: 't_2', key: 'company', label: 'Company', type: 'string' as any, description: 'Client company name', required: false, showInRest: true },
        { id: 't_3', key: 'rating', label: 'Rating (1-5)', type: 'integer' as any, description: 'Star rating', required: true, showInRest: true },
      ],
    },
    {
      id: 'course_1',
      slug: 'course',
      singularName: 'Course',
      pluralName: 'Courses',
      description: 'Educational programs and training modules',
      icon: 'welcome-learn-more',
      supports: ['title', 'editor', 'thumbnail', 'excerpt'],
      taxonomies: ['category'],
      showInRest: true,
      restBase: 'courses',
      metaFields: [
        { id: 'c_1', key: 'duration', label: 'Duration (Hours)', type: 'number' as any, description: 'Total course length', required: true, showInRest: true },
        { id: 'c_2', key: 'difficulty', label: 'Level', type: 'string' as any, description: 'Beginner, Intermediate, Advanced', required: true, showInRest: true },
        { id: 'c_3', key: 'is_certified', label: 'Certification Available', type: 'boolean' as any, description: 'Check if certificate is issued', required: false, showInRest: true },
      ],
    },
    {
      id: 'team_1',
      slug: 'team_member',
      singularName: 'Team Member',
      pluralName: 'Team Members',
      description: 'Staff and board profiles',
      icon: 'groups',
      supports: ['title', 'thumbnail'],
      taxonomies: ['department'],
      showInRest: true,
      restBase: 'team',
      metaFields: [
        { id: 'tm_1', key: 'job_title', label: 'Position', type: 'string' as any, description: 'Corporate title', required: true, showInRest: true },
        { id: 'tm_2', key: 'linkedin_url', label: 'LinkedIn Profile', type: 'string' as any, description: 'Full URL to profile', required: false, showInRest: true },
      ],
    },
    {
      id: 'service_1',
      slug: 'service',
      singularName: 'Service',
      pluralName: 'Services',
      description: 'Professional service offerings',
      icon: 'hammer',
      supports: ['title', 'editor', 'thumbnail'],
      taxonomies: [],
      showInRest: true,
      restBase: 'services',
      metaFields: [
        { id: 's_1', key: 'price_starting', label: 'Starting Price', type: 'number' as any, description: 'Base cost', required: false, showInRest: true },
      ],
    }
  ],
  taxonomies: [
    {
      id: 'tax_cat',
      slug: 'category',
      singularName: 'Category',
      pluralName: 'Categories',
      hierarchical: true,
      showInRest: true,
      connectedPostTypes: ['course'],
    },
    {
      id: 'tax_dept',
      slug: 'department',
      singularName: 'Department',
      pluralName: 'Departments',
      hierarchical: false,
      showInRest: true,
      connectedPostTypes: ['team_member'],
    },
  ],
  customEndpoints: [
    {
      id: 'ep_enroll',
      route: '/courses/enroll',
      method: 'POST',
      callbackFunction: 'handle_course_enrollment',
      description: 'Register a student for a specific course',
      hookName: 'on_student_enrollment',
      parameters: [
        { id: 'p_1', key: 'course_id', type: 'integer', required: true, description: 'ID of the course' },
        { id: 'p_2', key: 'student_email', type: 'string', required: true, description: 'Email address of the student' }
      ]
    },
    {
      id: 'ep_review',
      route: '/submit-review',
      method: 'POST',
      callbackFunction: 'handle_client_review',
      description: 'Submit a testimonial review from the frontend',
      hookName: 'new_testimonial_received',
      parameters: [
        { id: 'pr_1', key: 'name', type: 'string', required: true, description: 'Client Name' },
        { id: 'pr_2', key: 'content', type: 'string', required: true, description: 'Testimonial text' },
        { id: 'pr_3', key: 'rating', type: 'integer', required: true, description: '1 to 5' }
      ],
      storage: {
        enabled: true,
        targetCptSlug: 'testimonial',
        fieldMapping: {
          'name': 'client_name',
          'content': 'post_content',
          'rating': 'rating'
        }
      },
      customPhp: `// Rate Limiting: 5 requests per hour per IP
$user_ip = $_SERVER['REMOTE_ADDR'];
$transient_key = 'rate_limit_' . md5( $user_ip );
$limit = 5;
$window = 3600;

$count = get_transient( $transient_key );

if ( false === $count ) {
    $count = 0;
}

if ( $count >= $limit ) {
    return new WP_Error( 'too_many_requests', 'Rate limit exceeded. Please try again later.', array( 'status' => 429 ) );
}

set_transient( $transient_key, $count + 1, $window );

// Send notification to admin
$to = get_option('admin_email');
$subject = 'New Review Submitted';
$body = "A new review has been submitted by $name with a rating of $rating stars.";
$headers = array('Content-Type: text/html; charset=UTF-8');

wp_mail( $to, $subject, $body, $headers );

// Example of using global helper
if ( function_exists('send_audit_log') ) {
    send_audit_log('review_submission', get_current_user_id());
}`
    }
  ]
};
